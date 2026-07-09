-- Storage RLS policies for avatars bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Public read for avatars
CREATE POLICY storage_objects_public_read ON storage.objects
  FOR SELECT USING (bucket = 'avatars');

-- Authenticated users can upload avatars
CREATE POLICY storage_objects_auth_insert ON storage.objects
  FOR INSERT WITH CHECK (bucket = 'avatars' AND auth.role() = 'authenticated');

-- Authenticated users can update their avatars
CREATE POLICY storage_objects_auth_update ON storage.objects
  FOR UPDATE USING (bucket = 'avatars' AND auth.role() = 'authenticated')
  WITH CHECK (bucket = 'avatars' AND auth.role() = 'authenticated');

-- Authenticated users can delete avatars
CREATE POLICY storage_objects_auth_delete ON storage.objects
  FOR DELETE USING (bucket = 'avatars' AND auth.role() = 'authenticated');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
GRANT USAGE ON SCHEMA storage TO authenticated;
