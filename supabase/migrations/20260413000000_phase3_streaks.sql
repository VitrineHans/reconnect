-- Phase 3: Streak engine — server-side streak increment and expiry reset

-- ──────────────────────────────────────────────────────────────────────────
-- 1. Add window_opened_at to track when the current question was assigned
-- ──────────────────────────────────────────────────────────────────────────
ALTER TABLE public.friendships
  ADD COLUMN IF NOT EXISTS window_opened_at timestamptz;

-- ──────────────────────────────────────────────────────────────────────────
-- 2. Trigger: increment streak when BOTH friends have answered
--    Fires AFTER INSERT on question_responses
-- ──────────────────────────────────────────────────────────────────────────
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
    IF (latest_ts - earliest_ts) < INTERVAL '25 hours' THEN
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

DROP TRIGGER IF EXISTS trigger_streak_on_response ON public.question_responses;
CREATE TRIGGER trigger_streak_on_response
  AFTER INSERT ON public.question_responses
  FOR EACH ROW EXECUTE FUNCTION public.handle_streak_on_response();

-- ──────────────────────────────────────────────────────────────────────────
-- 3. Function: reset streak for expired windows (no both-answer within 25h)
-- ──────────────────────────────────────────────────────────────────────────
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
       AND window_opened_at + INTERVAL '25 hours' < now()
  LOOP
    SELECT COUNT(*) INTO resp_count
      FROM public.question_responses
     WHERE friendship_id = f.id
       AND question_id   = f.current_question_id;

    IF resp_count < 2 THEN
      UPDATE public.friendships
         SET streak_count       = 0,
             current_question_id = NULL,
             window_opened_at   = NULL
       WHERE id = f.id;
    END IF;
  END LOOP;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- 4. Update rotate_daily_questions to set window_opened_at on assignment
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rotate_daily_questions()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  f record;
  q_id uuid;
BEGIN
  FOR f IN
    SELECT id
      FROM public.friendships
     WHERE current_question_id IS NULL
  LOOP
    SELECT q.id INTO q_id
      FROM public.questions q
     WHERE q.id NOT IN (
       SELECT question_id
         FROM public.question_responses
        WHERE friendship_id = f.id
     )
     ORDER BY random()
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

-- ──────────────────────────────────────────────────────────────────────────
-- 5. Cron jobs
-- ──────────────────────────────────────────────────────────────────────────
SELECT cron.unschedule('rotate-daily-questions')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'rotate-daily-questions');

SELECT cron.schedule(
  'rotate-daily-questions',
  '0 0 * * *',
  $$ SELECT public.rotate_daily_questions(); $$
);

SELECT cron.unschedule('reset-expired-streaks')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reset-expired-streaks');

SELECT cron.schedule(
  'reset-expired-streaks',
  '0 * * * *',
  $$ SELECT public.reset_expired_streaks(); $$
);
