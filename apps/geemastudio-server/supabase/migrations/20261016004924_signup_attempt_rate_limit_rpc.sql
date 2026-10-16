-- Plan 19 W13 follow-up — rate limit atómico para signup-tenant.
-- Inserta el intento y cuenta en la misma transacción (evita TOCTOU).
CREATE OR REPLACE FUNCTION public.record_signup_attempt(
  p_ip_hash text,
  p_email_hash text,
  p_max_per_ip_hour integer DEFAULT 3,
  p_max_per_email_day integer DEFAULT 3
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $f$
DECLARE
  v_ip_count integer;
  v_email_count integer;
BEGIN
  IF p_ip_hash IS NULL OR length(p_ip_hash) < 8
     OR p_email_hash IS NULL OR length(p_email_hash) < 8 THEN
    RAISE EXCEPTION 'Hashes de intento inválidos';
  END IF;
  IF p_max_per_ip_hour < 1 OR p_max_per_email_day < 1 THEN
    RAISE EXCEPTION 'Límites inválidos';
  END IF;

  -- Serializa por IP para que ráfagas concurrentes no pasen el cupo.
  PERFORM pg_advisory_xact_lock(hashtext('signup:' || p_ip_hash));

  SELECT count(*)::integer INTO v_ip_count
  FROM public.signup_attempts
  WHERE ip_hash = p_ip_hash
    AND created_at >= now() - interval '1 hour';

  SELECT count(*)::integer INTO v_email_count
  FROM public.signup_attempts
  WHERE email_hash = p_email_hash
    AND created_at >= now() - interval '1 day';

  IF v_ip_count >= p_max_per_ip_hour OR v_email_count >= p_max_per_email_day THEN
    RETURN false;
  END IF;

  INSERT INTO public.signup_attempts (ip_hash, email_hash)
  VALUES (p_ip_hash, p_email_hash);

  RETURN true;
END;
$f$;

REVOKE ALL ON FUNCTION public.record_signup_attempt(text, text, integer, integer)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_signup_attempt(text, text, integer, integer)
  TO service_role;

COMMENT ON FUNCTION public.record_signup_attempt(text, text, integer, integer) IS
  'Registra un intento de alta si no supera el límite por IP/hora ni por correo/día. Solo service_role.';
