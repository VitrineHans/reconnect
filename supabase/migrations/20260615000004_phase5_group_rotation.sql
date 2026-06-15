-- Phase 5: Groups — personalized question rotation for groups.
--
-- Same selection rules as rotate_daily_questions() (mirrors
-- mobile/lib/questionSelection.ts), generalized from a 1:1 pair to N members:
--   • off-limit topics = UNION across all members (hard filter, never relaxed)
--   • depth capped at the most conservative member's depth_comfort (default 3)
--   • interest overlap (union across members) ranks higher; random tie-break
--   • excludes any question already answered by ANY member of the group
-- No group streaks in v1.

create or replace function public.rotate_group_questions()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  g          record;
  q_id       uuid;
  off_limits text[];
  interests  text[];
  depth_cap  int;
BEGIN
  FOR g IN
    SELECT id FROM public.groups WHERE current_question_id IS NULL
  LOOP
    -- Union of every member's off-limit topics (dropping the 'none' sentinel).
    SELECT coalesce(array_agg(DISTINCT t), '{}')
      INTO off_limits
      FROM public.group_members gm
      JOIN public.profiles p ON p.id = gm.user_id
      CROSS JOIN LATERAL jsonb_array_elements_text(
             coalesce(p.onboarding_answers->'off_limits', '[]'::jsonb)) AS t
     WHERE gm.group_id = g.id AND t <> 'none';

    -- Union of every member's interests (soft ranking boost).
    SELECT coalesce(array_agg(DISTINCT t), '{}')
      INTO interests
      FROM public.group_members gm
      JOIN public.profiles p ON p.id = gm.user_id
      CROSS JOIN LATERAL jsonb_array_elements_text(
             coalesce(p.onboarding_answers->'interests', '[]'::jsonb)) AS t
     WHERE gm.group_id = g.id;

    -- Lowest depth comfort across members; default 3 when missing/invalid.
    SELECT coalesce(min(
             CASE WHEN (p.onboarding_answers->>'depth_comfort') ~ '^[1-5]$'
                  THEN (p.onboarding_answers->>'depth_comfort')::int
                  ELSE 3 END), 3)
      INTO depth_cap
      FROM public.group_members gm
      JOIN public.profiles p ON p.id = gm.user_id
     WHERE gm.group_id = g.id;

    -- Pick: not answered by ANY member, never off-limit, prefer within depth
    -- cap (relaxed only if nothing fits), interest overlap, random tie-break.
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
                  WHERE group_id = g.id
               )
           AND NOT (q.topics && off_limits)
      ) e
     ORDER BY e.within_cap DESC, e.interest_score DESC, random()
     LIMIT 1;

    IF q_id IS NOT NULL THEN
      UPDATE public.groups
         SET current_question_id = q_id,
             window_opened_at    = now()
       WHERE id = g.id;
    END IF;
  END LOOP;
END;
$$;

-- Daily cron alongside the 1:1 rotation.
SELECT cron.unschedule('rotate-group-questions')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'rotate-group-questions');

SELECT cron.schedule(
  'rotate-group-questions',
  '0 0 * * *',
  $$ SELECT public.rotate_group_questions(); $$
);
