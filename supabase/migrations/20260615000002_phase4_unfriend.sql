-- Phase 4: Unfriend — let a friendship member delete the friendship.
--
-- friendships had SELECT/INSERT/UPDATE policies but no DELETE, so a client
-- delete silently no-opped under RLS. Deleting the row cascades its
-- question_responses (question_responses.friendship_id is ON DELETE CASCADE),
-- which clears the streak and active question for both members in one step.
create policy "Friends can delete their friendship"
  on public.friendships for delete
  using (auth.uid() = user_a or auth.uid() = user_b);
