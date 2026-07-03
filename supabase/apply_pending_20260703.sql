-- ═══════════════════════════════════════════════════════════════════════════
-- ONE-SHOT APPLY of pending migrations for the hosted Supabase project.
-- Generated 2026-07-03 from supabase/migrations/20260615000000 → 20260702000000.
--
-- WHY: schema probing showed the hosted DB is missing everything from
-- 2026-06-15 onward (questions.topics/depth, question_responses.group_id,
-- group rotation, reveal_reactions, 24h streak window, profile stats), while
-- groups/group_members tables partially exist from an earlier manual apply.
--
-- SAFE TO RE-RUN: every statement is idempotent (create table IF NOT EXISTS,
-- drop policy IF EXISTS before create, create OR REPLACE function,
-- add column IF NOT EXISTS, cron.schedule upserts by jobname).
--
-- HOW: Supabase Dashboard → SQL Editor → paste this whole file → Run.
-- ═══════════════════════════════════════════════════════════════════════════

do $pgcron$ begin
  create extension if not exists pg_cron;
exception when others then
  raise notice 'pg_cron not auto-enabled (%) — on Supabase enable it under Database -> Extensions, then re-run.', sqlerrm;
end $pgcron$;


-- ═════ 20260615000000_phase2_personalization.sql ═════
-- Phase 2: Personalization — question taxonomy
-- Adds the tagging dimensions that rotate_daily_questions() needs to honor
-- onboarding answers (interests, depth_comfort, off-limit topics).

-- ──────────────────────────────────────────────────────────────────────────
-- 1. Tag questions with topics + a depth level (1–5)
-- ──────────────────────────────────────────────────────────────────────────
-- `topics` is a controlled vocabulary that overlaps the onboarding answers:
--   • Interest tags (match profiles.onboarding_answers->'interests'):
--       music, sport, travel, food, gaming, reading, creative, film,
--       wellness, animals
--   • Sensitive tags (match profiles.onboarding_answers->'off_limits'):
--       family, money, relationships, health
-- A question may carry any number of tags (or none — a general question).
-- Off-limit filtering excludes any question whose topics intersect EITHER
-- friend's off_limits; interests are a soft ranking boost (never a filter).
--
-- `depth` mirrors onboarding_answers->'depth_comfort' (a 1–5 scale):
--   1–2 light/funny · 3 personal · 4–5 deep/vulnerable
-- Selection caps depth at the MORE conservative friend's comfort.
alter table public.questions
  add column if not exists topics text[] not null default '{}',
  add column if not exists depth smallint not null default 3
    check (depth between 1 and 5);

-- GIN index supports the array-overlap (&&) operators used during selection.
create index if not exists questions_topics_idx
  on public.questions using gin (topics);

-- ═════ 20260615000001_phase2_rotate_personalized.sql ═════
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

-- ═════ 20260615000002_phase4_unfriend.sql ═════
-- Phase 4: Unfriend — let a friendship member delete the friendship.
--
-- friendships had SELECT/INSERT/UPDATE policies but no DELETE, so a client
-- delete silently no-opped under RLS. Deleting the row cascades its
-- question_responses (question_responses.friendship_id is ON DELETE CASCADE),
-- which clears the streak and active question for both members in one step.
drop policy if exists "Friends can delete their friendship" on public.friendships;
create policy "Friends can delete their friendship"
  on public.friendships for delete
  using (auth.uid() = user_a or auth.uid() = user_b);

-- ═════ 20260615000003_phase5_groups.sql ═════
-- Phase 5: Groups — additive N-person loop alongside the 1:1 friendships path.
-- The proven friendships tables/policies are UNTOUCHED; groups reuse questions
-- and question_responses. No group streaks in v1. Reveal is progressive
-- "answer-to-unlock": you see a member's answer only once you've answered too.

-- ──────────────────────────────────────────────────────────────────────────
-- 1. Tables
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists public.groups (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null check (char_length(name) between 1 and 50),
  created_by          uuid references public.profiles(id) on delete cascade not null,
  current_question_id uuid references public.questions(id),
  window_opened_at    timestamptz,
  created_at          timestamptz default now()
);
alter table public.groups enable row level security;

create table if not exists public.group_members (
  group_id  uuid references public.groups(id) on delete cascade not null,
  user_id   uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);
alter table public.group_members enable row level security;

-- question_responses: allow group responses. Exactly one of friendship_id /
-- group_id is set. friendship_id was NOT NULL — relax it (existing 1:1 rows keep
-- their value and satisfy the new check).
alter table public.question_responses
  alter column friendship_id drop not null,
  add column if not exists group_id uuid references public.groups(id) on delete cascade;

alter table public.question_responses
  drop constraint if exists question_responses_owner_chk;
alter table public.question_responses
  add constraint question_responses_owner_chk
  check ((friendship_id is not null) <> (group_id is not null));

-- ──────────────────────────────────────────────────────────────────────────
-- 2. Security-definer helpers — bypass RLS so policies aren't self-referential
--    (avoids the recursive-RLS trap documented in 20260407000002).
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.is_group_member(gid uuid, uid uuid)
  returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.group_members where group_id = gid and user_id = uid);
$$;

create or replace function public.has_answered_group(gid uuid, qid uuid, uid uuid)
  returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.question_responses
    where group_id = gid and question_id = qid and user_id = uid
  );
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- 3. RLS: groups
-- ──────────────────────────────────────────────────────────────────────────
drop policy if exists "Members can view their groups" on public.groups;
create policy "Members can view their groups" on public.groups for select
  using (created_by = auth.uid() or public.is_group_member(id, auth.uid()));
drop policy if exists "Users can create groups" on public.groups;
create policy "Users can create groups" on public.groups for insert
  with check (created_by = auth.uid());
drop policy if exists "Creator can update group" on public.groups;
create policy "Creator can update group" on public.groups for update
  using (created_by = auth.uid());
drop policy if exists "Creator can delete group" on public.groups;
create policy "Creator can delete group" on public.groups for delete
  using (created_by = auth.uid());

-- ──────────────────────────────────────────────────────────────────────────
-- 4. RLS: group_members  (any member invites, anyone leaves, creator removes)
-- ──────────────────────────────────────────────────────────────────────────
drop policy if exists "Members can view group roster" on public.group_members;
create policy "Members can view group roster" on public.group_members for select
  using (public.is_group_member(group_id, auth.uid()));
drop policy if exists "Members or creator can add members" on public.group_members;
create policy "Members or creator can add members" on public.group_members for insert
  with check (
    public.is_group_member(group_id, auth.uid())
    or exists (select 1 from public.groups g where g.id = group_id and g.created_by = auth.uid())
  );
drop policy if exists "Leave or creator-remove" on public.group_members;
create policy "Leave or creator-remove" on public.group_members for delete
  using (
    user_id = auth.uid()
    or exists (select 1 from public.groups g where g.id = group_id and g.created_by = auth.uid())
  );

-- ──────────────────────────────────────────────────────────────────────────
-- 5. RLS: question_responses for group rows (1:1 friendship policies untouched)
-- ──────────────────────────────────────────────────────────────────────────
drop policy if exists "Members insert own group response" on public.question_responses;
create policy "Members insert own group response" on public.question_responses for insert
  with check (
    group_id is not null
    and user_id = auth.uid()
    and public.is_group_member(group_id, auth.uid())
  );
-- Progressive reveal: own response always; others' only after you've answered.
drop policy if exists "Group answer-to-unlock read" on public.question_responses;
create policy "Group answer-to-unlock read" on public.question_responses for select
  using (
    group_id is not null
    and public.is_group_member(group_id, auth.uid())
    and (user_id = auth.uid() or public.has_answered_group(group_id, question_id, auth.uid()))
  );

-- ═════ 20260615000004_phase5_group_rotation.sql ═════
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

-- ═════ 20260617000000_backfill_question_tags.sql ═════
-- Backfill question topics + depth on existing rows, keyed by English text.
--
-- The Phase 2 re-seed (stable ids + tags) can't be re-applied to a DB that
-- already has the original questions: it upserts on id, and the existing rows
-- have different UUIDs, so it would INSERT 54 duplicates. Matching on text lets
-- us tag the rows that are actually there. Idempotent. On a fresh `db reset`
-- this runs before the seed (0 rows) and is harmless — the seed sets the tags.
UPDATE public.questions q
   SET topics = v.topics, depth = v.depth
  FROM (VALUES
    -- Funny
    ('What''s the most embarrassing autocorrect fail you''ve sent to the wrong person?', '{}'::text[], 1),
    ('If you had to explain what you do for work using only emojis, what would you send?', '{}'::text[], 1),
    ('What''s the weirdest thing you''ve googled in the last week that you''d be mortified if someone saw?', '{}'::text[], 1),
    ('What''s a completely irrational hill you''re willing to die on?', '{}'::text[], 2),
    ('What''s the most ridiculous lie you told as a kid to get out of trouble?', '{}'::text[], 2),
    ('If your life had a laugh track, what situation would have triggered it most this week?', '{}'::text[], 1),
    ('What''s your personal worst "reply all" email disaster or closest call?', '{}'::text[], 1),
    ('What totally made-up word do you use at home that your household takes completely seriously?', '{}'::text[], 1),
    ('Describe the last time you confidently waved back at someone who wasn''t waving at you.', '{}'::text[], 1),
    ('What skill have you been pretending to have for years but still couldn''t execute if called upon today?', '{}'::text[], 1),
    ('If a documentary crew followed you around for one week, what would be the most awkward scene?', '{}'::text[], 1),
    ('What''s your most embarrassing "I thought I was on mute" or "I thought my camera was off" story?', '{}'::text[], 1),
    ('What''s the most dramatic way you''ve ever reacted to something that was 100% your fault?', '{}'::text[], 2),
    ('If you had to audition for a reality TV show with whatever talent you have right now, what would you do?', '{creative}'::text[], 1),
    ('What''s a food combination you eat in private that you would never admit to ordering in a restaurant?', '{food}'::text[], 1),
    ('When was the last time you laughed so hard at something completely inappropriate?', '{}'::text[], 2),
    ('What''s the most elaborate excuse you''ve ever constructed to avoid doing something simple?', '{}'::text[], 1),
    ('What''s a deeply held opinion about something trivial — like the correct way to load a dishwasher — that you would argue about at length?', '{}'::text[], 2),
    -- Deep
    ('Is there a belief you held for years that you''ve completely reversed on? What changed?', '{}'::text[], 4),
    ('What''s a version of yourself from five years ago that would surprise current you?', '{}'::text[], 4),
    ('When did you last feel genuinely proud of yourself, and did you let yourself sit with that feeling?', '{}'::text[], 4),
    ('What''s a fear you''ve never said out loud to anyone?', '{}'::text[], 5),
    ('If the people who love you most were asked to describe your blind spot, what do you think they''d say?', '{}'::text[], 5),
    ('What does "home" mean to you right now, and does any place actually feel like it?', '{}'::text[], 4),
    ('What are you currently tolerating in your life that you know you''ll eventually have to address?', '{}'::text[], 4),
    ('Is there something you''ve forgiven someone for but haven''t fully let go of?', '{relationships}'::text[], 5),
    ('What''s a chapter of your life you rarely talk about but shaped who you are significantly?', '{}'::text[], 5),
    ('What would you do differently if you knew no one would judge you for it?', '{}'::text[], 4),
    ('What relationship in your life has surprised you the most — either by growing or fading?', '{relationships}'::text[], 4),
    ('What''s something you want that you''ve talked yourself out of wanting because it feels too big?', '{}'::text[], 4),
    ('When you''re struggling, what''s your first instinct — reach out or go quiet?', '{}'::text[], 4),
    ('What''s a compliment you received that you still think about years later?', '{}'::text[], 3),
    ('What does your relationship with money reveal about your deeper values?', '{money}'::text[], 4),
    ('If you could send one message to your 16-year-old self, what would actually help them — not just reassure them?', '{}'::text[], 4),
    ('What''s something you wish people understood about you without you having to explain it?', '{}'::text[], 4),
    ('What''s the most important thing a relationship — friendship or romantic — has taught you about yourself?', '{relationships}'::text[], 4),
    -- Personal
    ('What''s something you''re proud of that you''ve never told anyone?', '{}'::text[], 3),
    ('What''s a habit or ritual that''s been quietly keeping you sane lately?', '{wellness}'::text[], 3),
    ('What''s something on your mind right now that you haven''t found the right moment to bring up with someone?', '{}'::text[], 3),
    ('What''s the last thing that genuinely excited you — not obligated you, but excited you?', '{}'::text[], 2),
    ('When was the last time you cried, and was it for the reason you''d admit first?', '{}'::text[], 4),
    ('What are you working on right now that nobody knows about?', '{}'::text[], 3),
    ('What''s a small act of kindness someone did for you that you still think about?', '{}'::text[], 2),
    ('What''s a decision you made recently that was entirely for yourself and no one else?', '{}'::text[], 3),
    ('What''s something you''ve been meaning to start — or stop — for longer than a year?', '{}'::text[], 3),
    ('What does your ideal Saturday morning look like, and when did you last actually have one?', '{wellness}'::text[], 2),
    ('What''s a moment from this past month that quietly meant a lot to you?', '{}'::text[], 3),
    ('Who do you call when something goes wrong? Who do you call when something goes right?', '{relationships}'::text[], 3),
    ('What''s something you''re in the middle of right now — creatively, professionally, personally — that you''re not ready to talk about publicly?', '{creative}'::text[], 3),
    ('What''s the most honest thing you could say about where you are in life right now?', '{}'::text[], 4),
    ('What''s a place you''ve been that changed how you see things?', '{travel}'::text[], 3),
    ('When do you feel most like yourself?', '{}'::text[], 3),
    ('What''s something you''ve given up on that you still grieve a little?', '{}'::text[], 4),
    ('What does your relationship with your phone say about what you''re actually looking for?', '{wellness}'::text[], 3)
  ) AS v(text, topics, depth)
 WHERE q.text = v.text;

-- ═════ 20260624000000_reveal_reactions.sql ═════
-- Feature: react to a reveal. After watching a friend's answer you can send a
-- quick emoji or a short typed line; the friend is notified. Lightweight
-- delivery only (no browsable history): rows are surfaced once, then marked seen.
create table if not exists public.reveal_reactions (
  id            uuid primary key default gen_random_uuid(),
  friendship_id uuid references public.friendships(id) on delete cascade not null,
  question_id   uuid references public.questions(id) not null,
  from_user     uuid references public.profiles(id) on delete cascade not null,  -- who reacted
  to_user       uuid references public.profiles(id) on delete cascade not null,  -- whose answer
  emoji         text,
  body          text check (body is null or char_length(body) <= 140),
  seen_at       timestamptz,
  created_at    timestamptz default now(),
  check (emoji is not null or body is not null)
);
alter table public.reveal_reactions enable row level security;

-- Sender inserts their own reactions, and only within a friendship they're in.
drop policy if exists "Send reactions in your friendship" on public.reveal_reactions;
create policy "Send reactions in your friendship" on public.reveal_reactions for insert
  with check (
    from_user = auth.uid()
    and exists (
      select 1 from public.friendships f
      where f.id = friendship_id and (f.user_a = auth.uid() or f.user_b = auth.uid())
    )
  );

-- Either participant can read; the recipient marks reactions seen.
drop policy if exists "Read reactions you sent or received" on public.reveal_reactions;
create policy "Read reactions you sent or received" on public.reveal_reactions for select
  using (from_user = auth.uid() or to_user = auth.uid());

drop policy if exists "Recipient marks reactions seen" on public.reveal_reactions;
create policy "Recipient marks reactions seen" on public.reveal_reactions for update
  using (to_user = auth.uid());

-- ═════ 20260624000001_streak_24h_window.sql ═════
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

-- ═════ 20260702000000_profile_stats.sql ═════
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
-- NOTE: trigger_streak_on_response (created in 20260413000000) is intentionally
-- not redeclared — CREATE OR REPLACE swaps the function body under the existing
-- binding. In the UPDATE below, greatest(best_streak, streak_count + 1) reads
-- the PRE-update streak_count, so streak_count + 1 equals the new value.
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

-- ── Safety net: (re)schedule the Phase 3 cron jobs in case the original
-- manual apply skipped them. cron.schedule upserts by jobname.
SELECT cron.schedule('rotate-daily-questions', '0 0 * * *',
  $$ SELECT public.rotate_daily_questions(); $$);
SELECT cron.schedule('reset-expired-streaks', '0 * * * *',
  $$ SELECT public.reset_expired_streaks(); $$);

-- ── Verification: every line below must return true.
select
  exists (select 1 from information_schema.columns where table_name='questions' and column_name='topics')            as questions_topics,
  exists (select 1 from information_schema.columns where table_name='question_responses' and column_name='group_id') as qr_group_id,
  exists (select 1 from information_schema.tables  where table_name='reveal_reactions')                              as reveal_reactions,
  exists (select 1 from information_schema.columns where table_name='friendships' and column_name='best_streak')     as best_streak,
  exists (select 1 from information_schema.columns where table_name='profiles' and column_name='total_answers')      as total_answers,
  exists (select 1 from pg_proc where proname='rotate_group_questions')                                              as group_rotation_fn;
