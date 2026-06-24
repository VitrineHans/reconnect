-- Streak engine test: 24h window. Loaded after schema_min + phase3 + the 24h
-- migration. Verifies skip-a-day reset and within-window increment on real PG.

-- A: streak 5, window opened 25h ago, only 1 answer → expired → reset to 0
insert into public.friendships (id, user_a, user_b, current_question_id, window_opened_at, streak_count) values
  ('aaaaaaaa-0000-4000-8000-0000000000a1', 'eeeeeeee-0000-4000-8000-000000000001', 'eeeeeeee-0000-4000-8000-000000000002', 'dddddddd-0000-4000-8000-000000000001', now() - interval '25 hours', 5);
insert into public.question_responses (friendship_id, question_id, user_id) values
  ('aaaaaaaa-0000-4000-8000-0000000000a1', 'dddddddd-0000-4000-8000-000000000001', 'eeeeeeee-0000-4000-8000-000000000001');

-- C: streak 3, window opened 10h ago, 1 answer → not expired → unchanged
insert into public.friendships (id, user_a, user_b, current_question_id, window_opened_at, streak_count) values
  ('aaaaaaaa-0000-4000-8000-0000000000c1', 'eeeeeeee-0000-4000-8000-000000000003', 'eeeeeeee-0000-4000-8000-000000000004', 'dddddddd-0000-4000-8000-000000000002', now() - interval '10 hours', 3);
insert into public.question_responses (friendship_id, question_id, user_id) values
  ('aaaaaaaa-0000-4000-8000-0000000000c1', 'dddddddd-0000-4000-8000-000000000002', 'eeeeeeee-0000-4000-8000-000000000003');

select public.reset_expired_streaks();

do $$
declare s int; q uuid;
begin
  select streak_count, current_question_id into s, q
    from public.friendships where id = 'aaaaaaaa-0000-4000-8000-0000000000a1';
  if s <> 0 or q is not null then
    raise exception 'STREAK FAIL: expired window not reset (streak=%, q=%)', s, q; end if;
  raise notice 'STREAK PASS  skip-a-day resets to 0 (streak cleared, question cleared)';

  select streak_count into s from public.friendships where id = 'aaaaaaaa-0000-4000-8000-0000000000c1';
  if s <> 3 then raise exception 'STREAK FAIL: live window wrongly reset (streak=%)', s; end if;
  raise notice 'STREAK PASS  live (<24h) window left intact (streak=3)';
end $$;

-- B: both answer within the window → trigger increments to 1
insert into public.friendships (id, user_a, user_b, current_question_id, window_opened_at, streak_count) values
  ('aaaaaaaa-0000-4000-8000-0000000000b1', 'eeeeeeee-0000-4000-8000-000000000005', 'eeeeeeee-0000-4000-8000-000000000006', 'dddddddd-0000-4000-8000-000000000003', now() - interval '2 hours', 0);
insert into public.question_responses (friendship_id, question_id, user_id) values
  ('aaaaaaaa-0000-4000-8000-0000000000b1', 'dddddddd-0000-4000-8000-000000000003', 'eeeeeeee-0000-4000-8000-000000000005');
insert into public.question_responses (friendship_id, question_id, user_id) values
  ('aaaaaaaa-0000-4000-8000-0000000000b1', 'dddddddd-0000-4000-8000-000000000003', 'eeeeeeee-0000-4000-8000-000000000006');

do $$
declare s int;
begin
  select streak_count into s from public.friendships where id = 'aaaaaaaa-0000-4000-8000-0000000000b1';
  if s <> 1 then raise exception 'STREAK FAIL: both-answered did not increment (streak=%)', s; end if;
  raise notice 'STREAK PASS  both answered within 24h -> +1 (streak=1)';
end $$;

select '*** ALL STREAK SCENARIOS PASSED ***' as result;
