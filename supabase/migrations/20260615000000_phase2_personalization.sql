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
