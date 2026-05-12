
DROP POLICY IF EXISTS "brand_assets_read" ON storage.objects;
CREATE POLICY "brand_assets_read_auth" ON storage.objects FOR SELECT
  USING (bucket_id = 'brand-assets' AND auth.uid() IS NOT NULL);
