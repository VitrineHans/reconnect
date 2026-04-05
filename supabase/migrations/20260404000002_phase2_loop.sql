-- Phase 2: Core Loop schema additions, corrected RLS, pg_cron scheduler

-- ============================================================
-- 1. Schema additions
-- ============================================================

-- Add current_question_id to friendships (LOOP-01)
alter table public.friendships
  add column if not exists current_question_id uuid references public.questions(id);

-- Add expires_at to question_responses (HOME-03)
alter table public.question_responses
  add column if not exists expires_at timestamptz;

-- Enable replica identity full on question_responses (Realtime UPDATE events)
alter table public.question_responses replica identity full;

-- ============================================================
-- 2. Videos storage bucket (private — signed URLs only)
-- ============================================================

insert into storage.buckets (id, name, public)
values ('videos', 'videos', false)
on conflict (id) do nothing;

-- Storage RLS: authenticated users can upload their own video
create policy "Friendship members can upload videos"
  on storage.objects for insert
  with check (
    bucket_id = 'videos'
    and auth.uid() is not null
  );

-- Storage RLS: authenticated users can read videos (via signed URL)
create policy "Friendship members can read videos"
  on storage.objects for select
  using (bucket_id = 'videos' and auth.uid() is not null);

-- Storage RLS: owner can delete their own video
-- Path convention: videos/{friendship_id}/{user_id}/{question_id}.mp4
-- foldername returns {friendship_id, user_id} so [2] = user_id (PostgreSQL 1-indexed)
create policy "Users can delete own videos"
  on storage.objects for delete
  using (
    bucket_id = 'videos'
    and auth.uid()::text = (storage.foldername(name))[2]
  );

-- ============================================================
-- 3. question_responses RLS — corrected SELECT policy (REVEAL-01)
-- ============================================================

-- Drop the existing broad policy that allowed any friendship member to see all responses
drop policy if exists "Only friendship members can access responses" on public.question_responses;

-- New secure SELECT policy: own response always; partner's only after both submitted
create policy "Users can read responses after both submitted"
  on public.question_responses for select
  using (
    auth.uid() = user_id
    or (
      exists (
        select 1 from public.friendships f
        where f.id = question_responses.friendship_id
          and (f.user_a = auth.uid() or f.user_b = auth.uid())
      )
      and (
        select count(*) from public.question_responses r2
        where r2.friendship_id = question_responses.friendship_id
          and r2.question_id = question_responses.question_id
      ) = 2
    )
  );

-- question_responses: INSERT policy (users can submit their own response)
create policy "Users can insert own responses"
  on public.question_responses for insert
  with check (auth.uid() = user_id);

-- question_responses: UPDATE policy (users can mark own response as watched)
create policy "Users can update own response"
  on public.question_responses for update
  using (auth.uid() = user_id);

-- ============================================================
-- 4. question_ratings RLS
-- ============================================================

-- Drop the existing broad policy
drop policy if exists "Users manage own ratings" on public.question_ratings;

-- Explicit INSERT and UPDATE policies (more granular than the old "for all")
create policy "Users can insert own ratings"
  on public.question_ratings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own ratings"
  on public.question_ratings for update
  using (auth.uid() = user_id);

create policy "Users can read own ratings"
  on public.question_ratings for select
  using (auth.uid() = user_id);

-- ============================================================
-- 5. pg_cron extension + rotate_daily_questions function
-- ============================================================

create extension if not exists pg_cron;

-- Function: assign a new question to friendships that need one
create or replace function public.rotate_daily_questions()
returns void language plpgsql security definer as $$
declare
  f record;
  q_id uuid;
begin
  for f in
    select id, user_a, user_b
    from public.friendships
    where
      -- No current question assigned
      current_question_id is null
      -- OR both users have responded (round complete)
      or (
        select count(*)
        from public.question_responses r
        where r.friendship_id = friendships.id
          and r.question_id = friendships.current_question_id
      ) = 2
  loop
    -- Pick a question not previously used in this friendship
    select q.id into q_id
    from public.questions q
    where q.id not in (
      select question_id
      from public.question_responses
      where friendship_id = f.id
    )
    order by random()
    limit 1;

    if q_id is not null then
      update public.friendships
      set current_question_id = q_id
      where id = f.id;
    end if;
  end loop;
end;
$$;

-- Schedule: run every day at midnight UTC
select cron.schedule(
  'rotate-daily-questions',
  '0 0 * * *',
  $$ select public.rotate_daily_questions(); $$
);
