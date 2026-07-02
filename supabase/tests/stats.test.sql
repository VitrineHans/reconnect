-- Profile stats test: total_answers counter + best_streak maintenance.
-- Loaded after schema_min + phase3 + 24h + profile_stats migrations.

insert into public.profiles (id, username) values
  ('eeeeeeee-0000-4000-8000-0000000000f1', 'stats_user_1'),
  ('eeeeeeee-0000-4000-8000-0000000000f2', 'stats_user_2');

-- Friendship at streak 4 (best so far 4): both answer within window → 5 / 5
insert into public.friendships (id, user_a, user_b, current_question_id, window_opened_at, streak_count, best_streak) values
  ('aaaaaaaa-0000-4000-8000-0000000000f1', 'eeeeeeee-0000-4000-8000-0000000000f1', 'eeeeeeee-0000-4000-8000-0000000000f2', 'dddddddd-0000-4000-8000-0000000000f1', now() - interval '2 hours', 4, 4);
insert into public.question_responses (friendship_id, question_id, user_id) values
  ('aaaaaaaa-0000-4000-8000-0000000000f1', 'dddddddd-0000-4000-8000-0000000000f1', 'eeeeeeee-0000-4000-8000-0000000000f1');
insert into public.question_responses (friendship_id, question_id, user_id) values
  ('aaaaaaaa-0000-4000-8000-0000000000f1', 'dddddddd-0000-4000-8000-0000000000f1', 'eeeeeeee-0000-4000-8000-0000000000f2');

do $$
declare s int; b int;
begin
  select streak_count, best_streak into s, b
    from public.friendships where id = 'aaaaaaaa-0000-4000-8000-0000000000f1';
  if s <> 5 or b <> 5 then
    raise exception 'STATS FAIL: expected streak 5 / best 5, got % / %', s, b; end if;
  raise notice 'STATS PASS  increment raises best_streak with streak (5/5)';
end $$;

-- Friendship at streak 6 / best 6: answers >24h apart → streak resets to 0,
-- best_streak keeps the historical high.
insert into public.friendships (id, user_a, user_b, current_question_id, window_opened_at, streak_count, best_streak) values
  ('aaaaaaaa-0000-4000-8000-0000000000f2', 'eeeeeeee-0000-4000-8000-0000000000f1', 'eeeeeeee-0000-4000-8000-0000000000f2', 'dddddddd-0000-4000-8000-0000000000f2', now() - interval '26 hours', 6, 6);
insert into public.question_responses (friendship_id, question_id, user_id, created_at) values
  ('aaaaaaaa-0000-4000-8000-0000000000f2', 'dddddddd-0000-4000-8000-0000000000f2', 'eeeeeeee-0000-4000-8000-0000000000f1', now() - interval '25 hours');
insert into public.question_responses (friendship_id, question_id, user_id) values
  ('aaaaaaaa-0000-4000-8000-0000000000f2', 'dddddddd-0000-4000-8000-0000000000f2', 'eeeeeeee-0000-4000-8000-0000000000f2');

do $$
declare s int; b int;
begin
  select streak_count, best_streak into s, b
    from public.friendships where id = 'aaaaaaaa-0000-4000-8000-0000000000f2';
  if s <> 0 or b <> 6 then
    raise exception 'STATS FAIL: expected streak 0 / best 6 after reset, got % / %', s, b; end if;
  raise notice 'STATS PASS  reset keeps historical best_streak (0/6)';
end $$;

-- total_answers: user 1 answered 2x, user 2 answered 2x — counted at insert,
-- and the count survives response deletion (simulating completeReveal cleanup).
delete from public.question_responses
 where friendship_id = 'aaaaaaaa-0000-4000-8000-0000000000f1';

do $$
declare c1 int; c2 int;
begin
  select total_answers into c1 from public.profiles where id = 'eeeeeeee-0000-4000-8000-0000000000f1';
  select total_answers into c2 from public.profiles where id = 'eeeeeeee-0000-4000-8000-0000000000f2';
  if c1 <> 2 or c2 <> 2 then
    raise exception 'STATS FAIL: expected total_answers 2/2, got %/%', c1, c2; end if;
  raise notice 'STATS PASS  total_answers counts at insert and survives cleanup (2/2)';
end $$;

select '*** ALL STATS SCENARIOS PASSED ***' as result;
