-- Phase 5: Groups — additive N-person loop alongside the 1:1 friendships path.
-- The proven friendships tables/policies are UNTOUCHED; groups reuse questions
-- and question_responses. No group streaks in v1. Reveal is progressive
-- "answer-to-unlock": you see a member's answer only once you've answered too.

-- ──────────────────────────────────────────────────────────────────────────
-- 1. Tables
-- ──────────────────────────────────────────────────────────────────────────
create table public.groups (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null check (char_length(name) between 1 and 50),
  created_by          uuid references public.profiles(id) on delete cascade not null,
  current_question_id uuid references public.questions(id),
  window_opened_at    timestamptz,
  created_at          timestamptz default now()
);
alter table public.groups enable row level security;

create table public.group_members (
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
create policy "Members can view their groups" on public.groups for select
  using (created_by = auth.uid() or public.is_group_member(id, auth.uid()));
create policy "Users can create groups" on public.groups for insert
  with check (created_by = auth.uid());
create policy "Creator can update group" on public.groups for update
  using (created_by = auth.uid());
create policy "Creator can delete group" on public.groups for delete
  using (created_by = auth.uid());

-- ──────────────────────────────────────────────────────────────────────────
-- 4. RLS: group_members  (any member invites, anyone leaves, creator removes)
-- ──────────────────────────────────────────────────────────────────────────
create policy "Members can view group roster" on public.group_members for select
  using (public.is_group_member(group_id, auth.uid()));
create policy "Members or creator can add members" on public.group_members for insert
  with check (
    public.is_group_member(group_id, auth.uid())
    or exists (select 1 from public.groups g where g.id = group_id and g.created_by = auth.uid())
  );
create policy "Leave or creator-remove" on public.group_members for delete
  using (
    user_id = auth.uid()
    or exists (select 1 from public.groups g where g.id = group_id and g.created_by = auth.uid())
  );

-- ──────────────────────────────────────────────────────────────────────────
-- 5. RLS: question_responses for group rows (1:1 friendship policies untouched)
-- ──────────────────────────────────────────────────────────────────────────
create policy "Members insert own group response" on public.question_responses for insert
  with check (
    group_id is not null
    and user_id = auth.uid()
    and public.is_group_member(group_id, auth.uid())
  );
-- Progressive reveal: own response always; others' only after you've answered.
create policy "Group answer-to-unlock read" on public.question_responses for select
  using (
    group_id is not null
    and public.is_group_member(group_id, auth.uid())
    and (user_id = auth.uid() or public.has_answered_group(group_id, question_id, auth.uid()))
  );
