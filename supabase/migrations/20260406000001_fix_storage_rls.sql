-- Add UPDATE policy for storage.objects so upsert uploads work
-- Path convention: videos/{friendship_id}/{user_id}/{question_id}.ext
-- foldername returns array of path segments, [2] = user_id (1-indexed)

create policy "Users can update own videos"
  on storage.objects for update
  using (
    bucket_id = 'videos'
    and auth.uid()::text = (storage.foldername(name))[2]
  )
  with check (
    bucket_id = 'videos'
    and auth.uid()::text = (storage.foldername(name))[2]
  );
