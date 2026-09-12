-- GeemaStudio — RLS Storage para bucket web-assets (CMS Mi Web)
-- Bucket ya existe (público). Políticas espejo de promo-images.
-- Path esperado: {tenant_slug}/{folder}/{timestamp}.webp

-- Lectura pública (landing /s/[slug])
DROP POLICY IF EXISTS public_read_web_assets ON storage.objects;
CREATE POLICY public_read_web_assets
  ON storage.objects
  FOR SELECT
  TO public
  USING (
    bucket_id = 'web-assets'
    AND name IS NOT NULL
    AND name <> ''
  );

-- Insert solo owner/dev
DROP POLICY IF EXISTS owner_dev_insert_web_assets ON storage.objects;
CREATE POLICY owner_dev_insert_web_assets
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'web-assets'
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = ANY (ARRAY['owner'::text, 'dev'::text])
    )
  );

-- Delete solo owner/dev
DROP POLICY IF EXISTS owner_dev_delete_web_assets ON storage.objects;
CREATE POLICY owner_dev_delete_web_assets
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'web-assets'
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = ANY (ARRAY['owner'::text, 'dev'::text])
    )
  );
