-- Plan 19 W13 — Alta de negocio self-service desde la web.
-- El hook custom_access_token_hook exige profiles.tenant_id, así que el tenant,
-- el perfil del dueño y tenant_settings se crean en el servidor (Edge Function
-- signup-tenant con service_role) antes del primer login.

-- 1. Correo del dueño confirmado (gate de WABA y promos masivas).
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS owner_email_verified_at timestamptz;

UPDATE public.tenants
SET owner_email_verified_at = created_at
WHERE owner_email_verified_at IS NULL;

COMMENT ON COLUMN public.tenants.owner_email_verified_at IS
  'Fecha en que el dueño confirmó su correo con un código OTP. Null = pendiente.';

-- 2. Intentos de alta para el límite por IP y por correo (solo service_role).
CREATE TABLE IF NOT EXISTS public.signup_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip_hash text NOT NULL,
  email_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signup_attempts_ip
  ON public.signup_attempts (ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signup_attempts_email
  ON public.signup_attempts (email_hash, created_at DESC);

ALTER TABLE public.signup_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.signup_attempts FROM anon, authenticated;
GRANT ALL ON public.signup_attempts TO service_role;

-- 3. Crear tenant + perfil owner + tenant_settings en una transacción.
CREATE OR REPLACE FUNCTION public.create_tenant_for_owner(
  p_user_id uuid,
  p_full_name text,
  p_business_name text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $f$
DECLARE
  v_name text := btrim(coalesce(p_business_name, ''));
  v_base text;
  v_slug text;
  v_n integer := 1;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Falta el usuario';
  END IF;
  IF length(v_name) < 2 OR length(v_name) > 80 THEN
    RAISE EXCEPTION 'El nombre del negocio debe tener entre 2 y 80 caracteres';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'El usuario ya tiene un negocio';
  END IF;

  v_base := lower(translate(v_name,
    'ÁÀÄÂÃáàäâãÉÈËÊéèëêÍÌÏÎíìïîÓÒÖÔÕóòöôõÚÙÜÛúùüûÑñÇç',
    'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuNnCc'));
  v_base := btrim(regexp_replace(v_base, '[^a-z0-9]+', '-', 'g'), '-');
  v_base := left(v_base, 40);
  v_base := btrim(v_base, '-');
  -- Prefijos reservados (demos y tenant propio) y slugs vacíos.
  IF v_base = '' OR v_base ~ '^(zm-|demo|geema|admin|api|www)' THEN
    v_base := 'negocio-' || coalesce(nullif(v_base, ''), 'nuevo');
  END IF;

  v_slug := v_base;
  WHILE EXISTS (SELECT 1 FROM public.tenants WHERE id = v_slug) LOOP
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  END LOOP;

  INSERT INTO public.tenants (
    id, business_name, plan_code, billing_cycle, subscription_status, trial_ends_at
  ) VALUES (
    v_slug, v_name, 'pro', 'monthly', 'trial', now() + interval '14 days'
  );

  INSERT INTO public.profiles (id, role, full_name, tenant_id)
  VALUES (p_user_id, 'owner', nullif(btrim(coalesce(p_full_name, '')), ''), v_slug);

  -- Terminología neutra; país, moneda, rubro y colores los completa el onboarding.
  INSERT INTO public.tenant_settings (
    tenant_slug, business_name, client_terminology, staff_terminology,
    staff_singular_terminology, is_configured
  ) VALUES (
    v_slug, v_name, 'cliente', 'Profesionales', 'Profesional', false
  );

  RETURN v_slug;
END;
$f$;

REVOKE ALL ON FUNCTION public.create_tenant_for_owner(uuid, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_tenant_for_owner(uuid, text, text) TO service_role;

-- 4. Marcar el correo del dueño como confirmado. Solo vale una sesión abierta
--    con un código OTP (amr del JWT), que prueba que el dueño recibe ese correo.
CREATE OR REPLACE FUNCTION public.mark_owner_email_verified()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $f$
DECLARE
  v_tenant text := public.current_tenant_id();
  v_at timestamptz;
BEGIN
  IF v_tenant = '' OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo el dueño puede confirmar el correo';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(coalesce(auth.jwt() -> 'amr', '[]'::jsonb)) AS m
    WHERE m ->> 'method' IN ('otp', 'magiclink')
  ) THEN
    RAISE EXCEPTION 'Ingresa con el código que te enviamos por correo';
  END IF;

  UPDATE public.tenants
  SET owner_email_verified_at = coalesce(owner_email_verified_at, now())
  WHERE id = v_tenant
  RETURNING owner_email_verified_at INTO v_at;

  RETURN v_at;
END;
$f$;

REVOKE ALL ON FUNCTION public.mark_owner_email_verified() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mark_owner_email_verified() TO authenticated;
