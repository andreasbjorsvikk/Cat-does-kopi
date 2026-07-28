
-- Allow any authenticated user to read peak-images objects, which is required
-- for createSignedUrl() to succeed. Direct URL access still requires a valid
-- storage signature (no anonymous public URLs).
DROP POLICY IF EXISTS "Authenticated can read peak images" ON storage.objects;
CREATE POLICY "Authenticated can read peak images"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'peak-images');
