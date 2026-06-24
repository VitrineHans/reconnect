-- Feature: react to a reveal. After watching a friend's answer you can send a
-- quick emoji or a short typed line; the friend is notified. Lightweight
-- delivery only (no browsable history): rows are surfaced once, then marked seen.
create table public.reveal_reactions (
  id            uuid primary key default gen_random_uuid(),
  friendship_id uuid references public.friendships(id) on delete cascade not null,
  question_id   uuid references public.questions(id) not null,
  from_user     uuid references public.profiles(id) on delete cascade not null,  -- who reacted
  to_user       uuid references public.profiles(id) on delete cascade not null,  -- whose answer
  emoji         text,
  body          text check (body is null or char_length(body) <= 140),
  seen_at       timestamptz,
  created_at    timestamptz default now(),
  check (emoji is not null or body is not null)
);
alter table public.reveal_reactions enable row level security;

-- Sender inserts their own reactions, and only within a friendship they're in.
create policy "Send reactions in your friendship" on public.reveal_reactions for insert
  with check (
    from_user = auth.uid()
    and exists (
      select 1 from public.friendships f
      where f.id = friendship_id and (f.user_a = auth.uid() or f.user_b = auth.uid())
    )
  );

-- Either participant can read; the recipient marks reactions seen.
create policy "Read reactions you sent or received" on public.reveal_reactions for select
  using (from_user = auth.uid() or to_user = auth.uid());

create policy "Recipient marks reactions seen" on public.reveal_reactions for update
  using (to_user = auth.uid());
