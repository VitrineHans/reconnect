-- The previous SELECT policy used a self-referential COUNT(*) subquery:
--
--   (select count(*) from public.question_responses r2
--    where r2.friendship_id = question_responses.friendship_id
--      and r2.question_id = question_responses.question_id) = 2
--
-- PostgreSQL applies RLS to that subquery too. So when Hans evaluates
-- visibility of Otto's row, the inner count only sees Hans's own row
-- (count=1 ≠ 2), making Otto's row permanently invisible to Hans even
-- after both have submitted. This broke the reveal state calculation.
--
-- Fix: friendship members can see all responses for their friendship.
-- The "don't show until both submitted" rule is enforced in the UI
-- (state machine in useFriendships.ts), not at the DB level.

drop policy if exists "Users can read responses after both submitted" on public.question_responses;

create policy "Friendship members can read responses"
  on public.question_responses for select
  using (
    exists (
      select 1 from public.friendships f
      where f.id = question_responses.friendship_id
        and (f.user_a = auth.uid() or f.user_b = auth.uid())
    )
  );
