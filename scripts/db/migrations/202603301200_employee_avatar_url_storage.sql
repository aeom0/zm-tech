-- Avatar de empleados: columna + bucket público para fotos del personal (SalonPro mobile Tab Más → Personal).
-- Aplicar en Supabase SQL Editor o vía `apply_migration` MCP.

ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS avatar_url text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-avatars',
  'employee-avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS employee_avatars_select_public ON storage.objects;
DROP POLICY IF EXISTS employee_avatars_insert_admin ON storage.objects;
DROP POLICY IF EXISTS employee_avatars_update_admin ON storage.objects;
DROP POLICY IF EXISTS employee_avatars_delete_admin ON storage.objects;

-- Lectura pública de objetos (URLs para Expo Image / agenda).
CREATE POLICY employee_avatars_select_public
ON storage.objects FOR SELECT
USING (bucket_id = 'employee-avatars');

-- Solo dueño/dev suben o reemplazan archivos del personal.
CREATE POLICY employee_avatars_insert_admin
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employee-avatars'
  AND (SELECT get_my_role()) = ANY (ARRAY['dev'::text, 'owner'::text])
);

CREATE POLICY employee_avatars_update_admin
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'employee-avatars'
  AND (SELECT get_my_role()) = ANY (ARRAY['dev'::text, 'owner'::text])
)
WITH CHECK (
  bucket_id = 'employee-avatars'
  AND (SELECT get_my_role()) = ANY (ARRAY['dev'::text, 'owner'::text])
);

CREATE POLICY employee_avatars_delete_admin
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'employee-avatars'
  AND (SELECT get_my_role()) = ANY (ARRAY['dev'::text, 'owner'::text])
);
