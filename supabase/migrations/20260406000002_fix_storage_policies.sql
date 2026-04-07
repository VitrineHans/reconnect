-- Drop all existing storage policies for videos bucket and recreate
DROP POLICY IF EXISTS "Friendship members can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Friendship members can read videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own videos" ON storage.objects;

-- Allow any authenticated user to upload to videos bucket
CREATE POLICY "videos_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'videos');

-- Allow any authenticated user to read from videos bucket (access via signed URL)
CREATE POLICY "videos_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'videos');

-- Allow any authenticated user to delete from videos bucket
CREATE POLICY "videos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'videos');

-- Allow any authenticated user to update in videos bucket
CREATE POLICY "videos_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'videos')
  WITH CHECK (bucket_id = 'videos');
