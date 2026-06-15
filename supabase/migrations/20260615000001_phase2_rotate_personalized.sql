-- Phase 2: Personalization — personalized rotate_daily_questions()
--
-- Replaces the random picker with onboarding-aware selection. This mirrors the
-- verified spec in mobile/lib/questionSelection.ts exactly — change both
-- together. Rules:
--   • off-limit topics (union of both friends, minus 'none') hard-filter the
--     pool and are NEVER relaxed
--   • depth caps at the more conservative friend's depth_comfort (default 3 when
--     missing/invalid), relaxed only if nothing safe fits the cap
--   • interest overlap (union of both friends) ranks higher; random() breaks
--     ties within the top tier so equally-good questions all get a turn
--
-- Still preserves the Phase 3 behavior: sets window_opened_at on assignment and
-- only touches friendships whose current_question_id is NULL. The pg_cron
-- schedule from the Phase 3 migration keeps calling this function unchanged.

CREATE OR REPLACE FUNCTION public.rotate_daily_questions()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  f          record;
  q_id       uuid;
  off_limits text[];
  interests  text[];
  depth_cap  int;
BEGIN
  FOR f IN
    SELECT id, user_a, user_b
      FROM public.friendships
     WHERE current_question_id IS NULL
  LOOP
    -- Union of both friends' off-limit topics, dropping the 'none' sentinel.
    SELECT coalesce(array_agg(DISTINCT t), '{}')
      INTO off_limits
      FROM public.profiles p
      CROSS JOIN LATERAL jsonb_array_elements_text(
             coalesce(p.onboarding_answers->'off_limits', '[]'::jsonb)) AS t
     WHERE p.id IN (f.user_a, f.user_b)
       AND t <> 'none';

    -- Union of both friends' interests (soft ranking boost).
    SELECT coalesce(array_agg(DISTINCT t), '{}')
      INTO interests
      FROM public.profiles p
      CROSS JOIN LATERAL jsonb_array_elements_text(
             coalesce(p.onboarding_answers->'interests', '[]'::jsonb)) AS t
     WHERE p.id IN (f.user_a, f.user_b);

    -- Depth cap = lower of the two comfort levels; default 3 when missing/invalid.
    SELECT coalesce(min(
             CASE WHEN (p.onboarding_answers->>'depth_comfort') ~ '^[1-5]$'
                  THEN (p.onboarding_answers->>'depth_comfort')::int
                  ELSE 3 END), 3)
      INTO depth_cap
      FROM public.profiles p
     WHERE p.id IN (f.user_a, f.user_b);

    -- Pick: unanswered + never off-limit; prefer within depth cap (within_cap
    -- DESC keeps the cap unless it would leave nothing), then interest overlap,
    -- then random tie-break within the top tier.
    SELECT e.id INTO q_id
      FROM (
        SELECT q.id,
               (q.depth <= depth_cap) AS within_cap,
               cardinality(ARRAY(
                 SELECT unnest(q.topics) INTERSECT SELECT unnest(interests)
               )) AS interest_score
          FROM public.questions q
         WHERE q.id NOT IN (
                 SELECT question_id
                   FROM public.question_responses
                  WHERE friendship_id = f.id
               )
           AND NOT (q.topics && off_limits)
      ) e
     ORDER BY e.within_cap DESC, e.interest_score DESC, random()
     LIMIT 1;

    IF q_id IS NOT NULL THEN
      UPDATE public.friendships
         SET current_question_id = q_id,
             window_opened_at    = now()
       WHERE id = f.id;
    END IF;
  END LOOP;
END;
$$;
