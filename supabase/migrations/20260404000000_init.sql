-- Users profile (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users can view any profile" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Questions bank
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  category text check (category in ('funny', 'deep', 'personal')) not null,
  created_at timestamptz default now()
);

-- Friendships (always store user_a < user_b to avoid duplicates)
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_a uuid references public.profiles(id) on delete cascade not null,
  user_b uuid references public.profiles(id) on delete cascade not null,
  streak_count integer default 0,
  last_answered_at timestamptz,
  created_at timestamptz default now(),
  unique(user_a, user_b),
  check (user_a < user_b)
);
alter table public.friendships enable row level security;
create policy "Friends can view their friendship" on public.friendships for select
  using (auth.uid() = user_a or auth.uid() = user_b);

-- Friend invites
create table public.friend_invites (
  id uuid primary key default gen_random_uuid(),
  from_user uuid references public.profiles(id) on delete cascade not null,
  to_user uuid references public.profiles(id) on delete cascade not null,
  status text check (status in ('pending', 'accepted', 'declined')) default 'pending',
  created_at timestamptz default now(),
  unique(from_user, to_user)
);
alter table public.friend_invites enable row level security;
create policy "Users can see their invites" on public.friend_invites for select
  using (auth.uid() = from_user or auth.uid() = to_user);

-- Question responses (video answers)
create table public.question_responses (
  id uuid primary key default gen_random_uuid(),
  friendship_id uuid references public.friendships(id) on delete cascade not null,
  question_id uuid references public.questions(id) not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  video_url text not null,
  watched_at timestamptz,
  created_at timestamptz default now()
);
alter table public.question_responses enable row level security;
create policy "Only friendship members can access responses" on public.question_responses for all
  using (
    exists (
      select 1 from public.friendships f
      where f.id = friendship_id
      and (f.user_a = auth.uid() or f.user_b = auth.uid())
    )
  );

-- Question ratings (like/dislike per user)
create table public.question_ratings (
  user_id uuid references public.profiles(id) on delete cascade not null,
  question_id uuid references public.questions(id) on delete cascade not null,
  rating smallint check (rating in (-1, 1)) not null, -- -1 dislike, 1 like
  created_at timestamptz default now(),
  primary key (user_id, question_id)
);
alter table public.question_ratings enable row level security;
create policy "Users manage own ratings" on public.question_ratings for all
  using (auth.uid() = user_id);
