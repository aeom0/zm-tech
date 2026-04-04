-- Perfil al registrarse + bootstrap si el trigger tardó (RLS employees / tenant_settings).
-- Idempotente: función REPLACE, trigger DROP IF EXISTS, política IF NOT EXISTS vía DO.

-- 1) Trigger: cada nuevo auth.users → fila profiles owner (SECURITY DEFINER, sin depender del cliente)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    NEW.id,
    'owner',
    COALESCE(
      NULLIF(trim(NEW.raw_user_meta_data ->> 'full_name'), ''),
      NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
      'Usuario'
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2) Política: el usuario autenticado puede crear su única fila como owner (respaldo si no hubo trigger)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'profiles' AND p.polname = 'profiles_insert_own_first'
  ) THEN
    CREATE POLICY profiles_insert_own_first ON public.profiles
      FOR INSERT TO authenticated
      WITH CHECK (
        id = (SELECT auth.uid())
        AND NOT EXISTS (
          SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid())
        )
        AND role = 'owner'::text
      );
  END IF;
END $$;
