-- Fase 5: template_analytics alarga el sync (~10s); default pg_net ~5s marca timeout falso.
CREATE OR REPLACE FUNCTION public.invoke_waba_pricing_sync()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'vault'
AS $function$
DECLARE
  v_sync_secret text;
  v_service_jwt text;
  v_request_id bigint;
BEGIN
  SELECT decrypted_secret INTO v_service_jwt
  FROM vault.decrypted_secrets
  WHERE name = 'waba_pricing_sync_service_jwt';

  SELECT decrypted_secret INTO v_sync_secret
  FROM vault.decrypted_secrets
  WHERE name = 'waba_pricing_sync_secret';

  IF coalesce(v_sync_secret, '') = '' OR coalesce(v_service_jwt, '') = '' THEN
    RAISE WARNING
      '[invoke_waba_pricing_sync] Faltan secrets en Vault: waba_pricing_sync_secret o waba_pricing_sync_service_jwt';
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := 'https://udelxwwnyivknslueerr.supabase.co/functions/v1/waba-pricing-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_jwt,
      'X-Sync-Secret', v_sync_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  )
  INTO v_request_id;

  RETURN v_request_id;
END;
$function$;

COMMENT ON FUNCTION public.invoke_waba_pricing_sync() IS
  'Invoca waba-pricing-sync vía pg_net (timeout 60s). Secrets Vault: waba_pricing_sync_secret, waba_pricing_sync_service_jwt. Solo postgres/service_role.';

