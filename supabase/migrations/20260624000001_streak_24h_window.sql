-- Streak window: strict 24 hours, no grace. Skipping a day resets the streak to
-- 0 (matches the product rule "miss the 24h window → streak resets, no grace").
-- Phase 3 used 25h (a 1-hour grace); redefine both streak functions with 24h.

CREATE OR REPLACE FUNCTION public.handle_streak_on_response()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  response_count integer;
  earliest_ts timestamptz;
  latest_ts timestamptz;
BEGIN
  SELECT COUNT(*), MIN(created_at), MAX(created_at)
    INTO response_count, earliest_ts, latest_ts
    FROM public.question_responses
    WHERE friendship_id = NEW.friendship_id
      AND question_id   = NEW.question_id;

  IF response_count >= 2 THEN
    IF (latest_ts - earliest_ts) < INTERVAL '24 hours' THEN
      UPDATE public.friendships
         SET streak_count     = streak_count + 1,
             last_answered_at = now()
       WHERE id = NEW.friendship_id;
    ELSE
      UPDATE public.friendships
         SET streak_count     = 0,
             last_answered_at = now()
       WHERE id = NEW.friendship_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_expired_streaks()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  f record;
  resp_count integer;
BEGIN
  FOR f IN
    SELECT id, current_question_id
      FROM public.friendships
     WHERE current_question_id IS NOT NULL
       AND window_opened_at IS NOT NULL
       AND window_opened_at + INTERVAL '24 hours' < now()
  LOOP
    SELECT COUNT(*) INTO resp_count
      FROM public.question_responses
     WHERE friendship_id = f.id
       AND question_id   = f.current_question_id;

    IF resp_count < 2 THEN
      UPDATE public.friendships
         SET streak_count        = 0,
             current_question_id = NULL,
             window_opened_at    = NULL
       WHERE id = f.id;
    END IF;
  END LOOP;
END;
$$;
