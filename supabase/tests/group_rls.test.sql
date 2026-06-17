-- Role-based RLS test for the Phase 5 group policies, run against real Postgres.
-- Loaded after rls_auth_stub.sql + schema_min.sql + the phase5 groups migration.
-- We seed data as the table owner (bypasses RLS), then SET ROLE to a plain role
-- so the policies actually apply, switching "logged-in user" via the test.uid GUC.

-- init.sql enables RLS on question_responses in prod; schema_min doesn't, so do
-- it here (the phase5 migration only enables it on groups/group_members).
alter table public.question_responses enable row level security;

drop role if exists app_user;
create role app_user nologin;
grant usage on schema public, auth to app_user;
grant select, insert, update, delete on all tables in schema public to app_user;
grant execute on all functions in schema public to app_user;
grant execute on all functions in schema auth to app_user;

-- ── Seed (as owner) ───────────────────────────────────────────────────────────
insert into public.profiles (id, username) values
  ('11111111-1111-4111-8111-111111111111', 'u1'),
  ('22222222-2222-4222-8222-222222222222', 'u2'),
  ('33333333-3333-4333-8333-333333333333', 'u3'),
  ('99999999-9999-4999-8999-999999999999', 'outsider');
insert into public.questions (id, text, category) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'Group question?', 'funny');
insert into public.groups (id, name, created_by, current_question_id) values
  ('aaaaaaaa-0000-4000-8000-0000000000a0', 'Crew', '11111111-1111-4111-8111-111111111111', 'bbbbbbbb-0000-4000-8000-000000000001');
insert into public.group_members (group_id, user_id) values
  ('aaaaaaaa-0000-4000-8000-0000000000a0', '11111111-1111-4111-8111-111111111111'),
  ('aaaaaaaa-0000-4000-8000-0000000000a0', '22222222-2222-4222-8222-222222222222'),
  ('aaaaaaaa-0000-4000-8000-0000000000a0', '33333333-3333-4333-8333-333333333333');
-- u1 and u2 have answered; u3 has NOT
insert into public.question_responses (group_id, question_id, user_id) values
  ('aaaaaaaa-0000-4000-8000-0000000000a0', 'bbbbbbbb-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111'),
  ('aaaaaaaa-0000-4000-8000-0000000000a0', 'bbbbbbbb-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222');

-- ── Assertions (as a non-owner role, so RLS applies) ──────────────────────────
set role app_user;

do $$
declare n int;
  g  constant uuid := 'aaaaaaaa-0000-4000-8000-0000000000a0';
  u1 constant uuid := '11111111-1111-4111-8111-111111111111';
  u3 constant uuid := '33333333-3333-4333-8333-333333333333';
  outsider constant uuid := '99999999-9999-4999-8999-999999999999';
begin
  -- group visibility: member yes, outsider no
  perform set_config('test.uid', u1::text, false);
  select count(*) into n from public.groups where id = g;
  if n <> 1 then raise exception 'RLS FAIL: member cannot see own group (got %)', n; end if;
  perform set_config('test.uid', outsider::text, false);
  select count(*) into n from public.groups where id = g;
  if n <> 0 then raise exception 'RLS FAIL: outsider can see group (got %)', n; end if;
  raise notice 'RLS PASS  group visibility (member sees it, outsider does not)';

  -- roster visibility: member sees all 3, outsider sees none
  perform set_config('test.uid', u1::text, false);
  select count(*) into n from public.group_members where group_id = g;
  if n <> 3 then raise exception 'RLS FAIL: member sees % of 3 roster rows', n; end if;
  perform set_config('test.uid', outsider::text, false);
  select count(*) into n from public.group_members where group_id = g;
  if n <> 0 then raise exception 'RLS FAIL: outsider sees roster (got %)', n; end if;
  raise notice 'RLS PASS  roster visibility';

  -- answer-to-unlock: u3 (not answered) sees 0; u1 (answered) sees both
  perform set_config('test.uid', u3::text, false);
  select count(*) into n from public.question_responses where group_id = g;
  if n <> 0 then raise exception 'RLS FAIL: un-answered member sees % responses (must be 0)', n; end if;
  perform set_config('test.uid', u1::text, false);
  select count(*) into n from public.question_responses where group_id = g;
  if n <> 2 then raise exception 'RLS FAIL: answered member sees % responses (must be 2)', n; end if;
  raise notice 'RLS PASS  answer-to-unlock (un-answered sees 0, answered sees all)';
end $$;

reset role;
select '*** ALL GROUP RLS SCENARIOS PASSED ***' as result;
