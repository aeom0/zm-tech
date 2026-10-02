-- Avatar de empleados: columna + bucket público + políticas de Storage (idempotente).
-- Reemplaza el script legacy 202603301200_employee_avatar_url_storage.sql, que usaba
-- get_my_role() (inexistente en prod); se usa el patrón profiles.role de los demás buckets.

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS avatar_url text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('employee-avatars', 'employee-avatars', true, 5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp']::text[])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='public_read_employee_avatars') THEN
    CREATE POLICY public_read_employee_avatars ON storage.objects FOR SELECT
      USING (bucket_id = 'employee-avatars' AND name IS NOT NULL AND name <> '');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='owner_dev_insert_employee_avatars') THEN
    CREATE POLICY owner_dev_insert_employee_avatars ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'employee-avatars' AND EXISTS (
        SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY (ARRAY['owner','dev'])));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='owner_dev_update_employee_avatars') THEN
    CREATE POLICY owner_dev_update_employee_avatars ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'employee-avatars' AND EXISTS (
        SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY (ARRAY['owner','dev'])))
      WITH CHECK (bucket_id = 'employee-avatars' AND EXISTS (
        SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY (ARRAY['owner','dev'])));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='owner_dev_delete_employee_avatars') THEN
    CREATE POLICY owner_dev_delete_employee_avatars ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'employee-avatars' AND EXISTS (
        SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY (ARRAY['owner','dev'])));
  END IF;
END $$;
