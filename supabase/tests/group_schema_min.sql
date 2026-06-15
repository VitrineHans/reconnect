-- Test-only minimal group schema (no RLS) for the group rotation DB test.
-- Mirrors the columns rotate_group_questions() touches; layered on schema_min.sql.

create table public.groups (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  created_by          uuid,
  current_question_id uuid references public.questions(id),
  window_opened_at    timestamptz,
  created_at          timestamptz default now()
);

create table public.group_members (
  group_id  uuid references public.groups(id) on delete cascade not null,
  user_id   uuid not null,
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

-- question_responses gains group_id (friendship_id relaxed to nullable) so group
-- answers can be recorded with friendship_id NULL.
alter table public.question_responses
  alter column friendship_id drop not null,
  add column if not exists group_id uuid references public.groups(id) on delete cascade;
