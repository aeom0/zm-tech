-- S1-5 (Plan 05 / Plan 02 §11): Auth Hook sin fallback zm-lash-nails
-- Pre: todos los profiles con tenant_id explícito (verificado 2026-08-29)

UPDATE public.profiles
SET tenant_id = 'zm-lash-nails'
WHERE tenant_id IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.profiles
  ALTER COLUMN tenant_id DROP DEFAULT;

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

  IF v_tenant_id IS NULL OR btrim(v_tenant_id) = '' THEN
    RAISE EXCEPTION 'profile_missing_tenant_id';
  END IF;

  claims := jsonb_set(
    event->'claims',
    '{tenant_id}',
    to_jsonb(v_tenant_id)
  );
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

COMMENT ON FUNCTION public.custom_access_token_hook(jsonb) IS
  'Custom Access Token Hook: claim tenant_id desde profiles. Falla login si falta tenant (S1-5).';

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM authenticated, anon, public;
