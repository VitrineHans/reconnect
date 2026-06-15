-- Localize question content. Questions are DB content (seeded in English); this
-- adds per-language overrides so the app can show the question in the user's
-- language. `text` stays the canonical English; the app reads
-- text_i18n[lang] ?? text (so ES/DE/FR fall back to English, like the rest of
-- the UI). Translations are loaded by the seed (supabase/seeds/questions.sql).
alter table public.questions
  add column if not exists text_i18n jsonb not null default '{}'::jsonb;
