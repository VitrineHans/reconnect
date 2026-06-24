-- Minimal faithful schema for the rotate_daily_questions() DB test.
-- Columns match the real Supabase schema for the tables the function touches;
-- Supabase-only concerns (auth FKs, RLS, pg_cron, storage) are omitted because
-- they don't affect the SELECT logic inside the SECURITY DEFINER function. The
-- Phase 2 taxonomy migration adds questions.topics/depth on top of this.

create table public.profiles (
  id                 uuid primary key,
  username           text,
  onboarding_answers jsonb
);

create table public.questions (
  id       uuid primary key,
  text     text not null,
  category text not null
);

create table public.friendships (
  id                  uuid primary key,
  user_a              uuid not null,
  user_b              uuid not null,
  current_question_id uuid,
  window_opened_at    timestamptz,
  streak_count        integer default 0,
  last_answered_at    timestamptz
);

create table public.question_responses (
  id            uuid primary key default gen_random_uuid(),
  friendship_id uuid not null,
  question_id   uuid not null,
  user_id       uuid not null,
  created_at    timestamptz default now()
);
