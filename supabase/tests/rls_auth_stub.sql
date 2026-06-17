-- Test-only stub of Supabase's auth.uid() so RLS policies can be exercised in
-- the throwaway harness. Reads the current "logged-in" user from a session GUC
-- (test.uid) that the RLS test sets per scenario.
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('test.uid', true), '')::uuid
$$;
