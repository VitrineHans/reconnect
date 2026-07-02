-- Profile stats foundation (finalization pass).
--
-- question_responses rows are deleted once both friends have watched
-- (completeReveal in the app) and when groups rotate, so lifetime stats CANNOT
-- be derived from surviving rows. Count them at insert time instead:
--   * profiles.total_answers  — lifetime video answers submitted (1:1 + group)
--   * friendships.best_streak — highest streak the friendship ever reached
-- Backfills are additive and non-destructive (they only raise values).

alter table public.profiles
  add column if not exists total_answers integer not null default 0;

alter table public.friendships
  add column if not exists best_streak integer not null default 0;

-- ── Lifetime answer counter ──────────────────────────────────────────────────
create or replace function public.handle_answer_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
     set total_answers = total_answers + 1
   where id = new.user_id;
  return new;
end;
$$;

drop trigger if exists trigger_answer_count on public.question_responses;
create trigger trigger_answer_count
  after insert on public.question_responses
  for each row execute function public.handle_answer_count();

-- ── Streak trigger: also track best_streak ───────────────────────────────────
-- Same 24h logic as 20260624000001; adds best_streak maintenance and skips
-- group responses (friendship_id is null — groups have no streaks) explicitly.
CREATE OR REPLACE FUNCTION public.handle_streak_on_response()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  response_count integer;
  earliest_ts timestamptz;
  latest_ts timestamptz;
BEGIN
  IF NEW.friendship_id IS NULL THEN
    RETURN NEW; -- group answer: groups have no streaks
  END IF;

  SELECT COUNT(*), MIN(created_at), MAX(created_at)
    INTO response_count, earliest_ts, latest_ts
    FROM public.question_responses
    WHERE friendship_id = NEW.friendship_id
      AND question_id   = NEW.question_id;

  IF response_count >= 2 THEN
    IF (latest_ts - earliest_ts) < INTERVAL '24 hours' THEN
      UPDATE public.friendships
         SET streak_count     = streak_count + 1,
             best_streak      = greatest(best_streak, streak_count + 1),
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

-- ── Backfill ─────────────────────────────────────────────────────────────────
-- best_streak starts at the current streak (the best we can still observe).
update public.friendships
   set best_streak = streak_count
 where streak_count > best_streak;

-- total_answers starts at the count of surviving response rows per user.
update public.profiles p
   set total_answers = sub.cnt
  from (
    select user_id, count(*)::int as cnt
      from public.question_responses
     group by user_id
  ) sub
 where p.id = sub.user_id
   and sub.cnt > p.total_answers;
