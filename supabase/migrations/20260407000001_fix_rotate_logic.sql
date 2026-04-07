-- Fix rotate_daily_questions: only rotate when current_question_id is null.
--
-- The previous version also rotated when both users had submitted (response count = 2).
-- That caused a new question to be assigned while videos were still unwatched, breaking
-- the reveal flow. Rotation is now triggered exclusively from completeReveal() in the
-- mobile app after both users have watched (and responses/videos are cleaned up).

create or replace function public.rotate_daily_questions()
returns void language plpgsql security definer as $$
declare
  f record;
  q_id uuid;
begin
  for f in
    select id
    from public.friendships
    where current_question_id is null
  loop
    -- Pick a question not previously used by this friendship
    select q.id into q_id
    from public.questions q
    where q.id not in (
      select question_id
      from public.question_responses
      where friendship_id = f.id
    )
    order by random()
    limit 1;

    if q_id is not null then
      update public.friendships
      set current_question_id = q_id
      where id = f.id;
    end if;
  end loop;
end;
$$;

-- Also fix the watched_at UPDATE policy: the viewer (the other user) sets watched_at
-- on the friend's response row, so we need friendship-level permission not just owner.
drop policy if exists "Users can update own response" on public.question_responses;
drop policy if exists "Friendship members can update responses" on public.question_responses;

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
