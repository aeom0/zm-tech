ALTER TABLE public.wa_action_debounce
  DROP CONSTRAINT IF EXISTS wa_action_debounce_pkey;

ALTER TABLE public.wa_action_debounce
  ADD CONSTRAINT wa_action_debounce_pkey
  PRIMARY KEY (tenant_id, phone, kind);

DROP FUNCTION IF EXISTS public.waba_claim_action_debounce(text, text, integer);
DROP FUNCTION IF EXISTS public.waba_release_action_debounce(text, text);

CREATE OR REPLACE FUNCTION public.waba_claim_action_debounce(
  p_phone text,
  p_kind text,
  p_window_seconds integer DEFAULT 300,
  p_tenant_id text DEFAULT 'zm-lash-nails'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  won boolean := false;
  v_tenant text;
BEGIN
  IF p_phone IS NULL OR length(trim(p_phone)) = 0 THEN
    RETURN false;
  END IF;
  IF p_kind IS NULL OR length(trim(p_kind)) = 0 THEN
    RETURN false;
  END IF;
  IF p_window_seconds IS NULL OR p_window_seconds < 1 THEN
    p_window_seconds := 300;
  END IF;

  v_tenant := coalesce(nullif(trim(p_tenant_id), ''), 'zm-lash-nails');

  INSERT INTO public.wa_action_debounce AS d (tenant_id, phone, kind, claimed_at)
  VALUES (v_tenant, trim(p_phone), trim(p_kind), now())
  ON CONFLICT (tenant_id, phone, kind) DO UPDATE
    SET claimed_at = now()
    WHERE d.claimed_at < now() - make_interval(secs => p_window_seconds)
  RETURNING true INTO won;

  RETURN COALESCE(won, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.waba_release_action_debounce(
  p_phone text,
  p_kind text,
  p_tenant_id text DEFAULT 'zm-lash-nails'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant text;
BEGIN
  IF p_phone IS NULL OR p_kind IS NULL THEN
    RETURN;
  END IF;
  v_tenant := coalesce(nullif(trim(p_tenant_id), ''), 'zm-lash-nails');
  DELETE FROM public.wa_action_debounce
    WHERE tenant_id = v_tenant
      AND phone = trim(p_phone)
      AND kind = trim(p_kind);
END;
$$;

REVOKE ALL ON FUNCTION public.waba_claim_action_debounce(text, text, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.waba_claim_action_debounce(text, text, integer, text) TO service_role;

REVOKE ALL ON FUNCTION public.waba_release_action_debounce(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.waba_release_action_debounce(text, text, text) TO service_role;
