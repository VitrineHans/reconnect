-- Allow friendship members to set watched_at on a partner's response.
-- The previous policy only allowed owners to update their own row, which
-- blocked the viewer from marking the friend's video as watched.

drop policy if exists "Users can update own response" on public.question_responses;

create policy "Friendship members can update responses"
  on public.question_responses for update
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.friendships f
      where f.id = question_responses.friendship_id
        and (f.user_a = auth.uid() or f.user_b = auth.uid())
    )
  );
