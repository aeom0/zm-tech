-- Plan 02 Fase C — Parte 1/2
-- Tabla tenants + current_tenant_id() + custom_access_token_hook + grants + tenants_select_own
-- NO toca las 66 policies todavia (eso es Parte 2, despues de activar el Auth Hook en Dashboard)

-- 1. Tabla tenants
CREATE TABLE IF NOT EXISTS public.tenants (
  id text PRIMARY KEY,
  business_name text NOT NULL,
  vertical text NOT NULL DEFAULT 'beauty',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.tenants (id, business_name)
VALUES ('zm-lash-nails', 'ZM Lash & Nails Beauty')
ON CONFLICT (id) DO NOTHING;

GRANT ALL ON public.tenants TO service_role;

-- 2. current_tenant_id()
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS text
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT coalesce(auth.jwt() ->> 'tenant_id', '');
$$;

COMMENT ON FUNCTION public.current_tenant_id() IS
  'Tenant del JWT (Custom Access Token Hook). Vacio = fail-closed (cero filas).';

GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO service_role;
GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO anon;

-- 3. custom_access_token_hook
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  claims jsonb;
  v_tenant_id text;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM public.profiles
  WHERE id = (event->>'user_id')::uuid;

  claims := jsonb_set(
    event->'claims',
    '{tenant_id}',
    to_jsonb(coalesce(v_tenant_id, 'zm-lash-nails'))
  );
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

COMMENT ON FUNCTION public.custom_access_token_hook(jsonb) IS
  'Custom Access Token Hook: anade claim tenant_id desde profiles.';

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM authenticated, anon, public;
GRANT SELECT ON TABLE public.profiles TO supabase_auth_admin;

-- 4. RLS tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenants_select_own" ON public.tenants;
CREATE POLICY "tenants_select_own" ON public.tenants
  FOR SELECT TO authenticated
  USING (id = public.current_tenant_id());
GRANT SELECT ON public.tenants TO authenticated;
