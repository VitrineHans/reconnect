-- Phase 1 additions
-- New columns on profiles
alter table public.profiles
  add column if not exists push_token text,
  add column if not exists onboarding_answers jsonb;

-- profiles INSERT policy (trigger uses security definer but add explicit policy as fallback)
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- friend_invites: INSERT policy (from_user must be caller)
create policy "Users can send invites"
  on public.friend_invites for insert
  with check (auth.uid() = from_user);

-- friend_invites: UPDATE policy (to_user can accept/decline)
create policy "Users can respond to invites"
  on public.friend_invites for update
  using (auth.uid() = to_user);

-- friend_invites: DELETE policy (sender can withdraw)
create policy "Users can cancel their own invites"
  on public.friend_invites for delete
  using (auth.uid() = from_user);

-- friendships: INSERT policy (trigger uses security definer; client fallback)
create policy "Friends can create friendships"
  on public.friendships for insert
  with check (auth.uid() = user_a or auth.uid() = user_b);

-- Trigger: auto-create profile row when auth.users row is inserted
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name)
  values (new.id, '', '')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger: create friendship when invite accepted (uses least/greatest for user_a < user_b)
create or replace function public.handle_invite_accepted()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'accepted' and old.status = 'pending' then
    insert into public.friendships (user_a, user_b, streak_count)
    values (
      least(new.from_user, new.to_user),
      greatest(new.from_user, new.to_user),
      0
    )
    on conflict (user_a, user_b) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_invite_accepted on public.friend_invites;
create trigger on_invite_accepted
  after update on public.friend_invites
  for each row execute procedure public.handle_invite_accepted();

-- Avatars storage bucket for profile photos (public read, authenticated write)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Authenticated users can upload avatars"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid() is not null);

create policy "Anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can update own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
