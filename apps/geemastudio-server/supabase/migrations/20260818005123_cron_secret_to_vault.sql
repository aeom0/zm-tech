DO $$
DECLARE
  v_secret text;
  v_cmd text;
BEGIN
  IF EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'cron_secret') THEN
    RETURN;
  END IF;

  SELECT command INTO v_cmd
  FROM cron.job
  WHERE command ~ 'Bearer [0-9a-f]{64}'
  ORDER BY jobid
  LIMIT 1;

  v_secret := (regexp_match(coalesce(v_cmd, ''), 'Bearer ([0-9a-f]{64})'))[1];

  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE WARNING
      '[cron_secret] no se pudo sembrar desde cron.job — crear a mano: vault.create_secret(<CRON_SECRET>, ''cron_secret'', ...)';
    RETURN;
  END IF;

  PERFORM vault.create_secret(
    v_secret,
    'cron_secret',
    'Bearer CRON_SECRET para pg_cron → Edge Functions (verify_jwt=false)'
  );
END $$;

CREATE OR REPLACE FUNCTION public.invoke_cron_edge_function(p_function_name text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  v_secret text;
  v_request_id bigint;
  v_allowed text[] := ARRAY[
    'abandoned-cart-reminders',
    'ads-bounce-nudge',
    'appointment-reminders',
    'browse-reengage',
    'cart-nudge',
    'chat-quality-review',
    'generate-recurring-expenses',
    'retouch-reminders',
    'same-day-appointment-reminder',
    'silence-watchdog',
    'sync-meta-ads-spend'
  ];
BEGIN
  IF p_function_name IS NULL OR NOT (p_function_name = ANY (v_allowed)) THEN
    RAISE EXCEPTION 'invoke_cron_edge_function: función no permitida: %', p_function_name;
  END IF;

  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'cron_secret';

  IF coalesce(v_secret, '') = '' THEN
    RAISE WARNING '[invoke_cron_edge_function] Falta secret Vault cron_secret';
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := 'https://udelxwwnyivknslueerr.supabase.co/functions/v1/' || p_function_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := '{}'::jsonb
  )
  INTO v_request_id;

  RETURN v_request_id;
END;
$$;

COMMENT ON FUNCTION public.invoke_cron_edge_function(text) IS
  'Invoca Edge Function de cron vía pg_net. Secret en Vault (cron_secret). Solo postgres/service_role.';

REVOKE ALL ON FUNCTION public.invoke_cron_edge_function(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.invoke_cron_edge_function(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invoke_cron_edge_function(text) TO postgres, service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'abandoned-cart-reminders') THEN
    PERFORM cron.unschedule('abandoned-cart-reminders');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ads-bounce-nudge-every-30min') THEN
    PERFORM cron.unschedule('ads-bounce-nudge-every-30min');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'appointment-reminders-daily') THEN
    PERFORM cron.unschedule('appointment-reminders-daily');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'browse-reengage-every-15min') THEN
    PERFORM cron.unschedule('browse-reengage-every-15min');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cart-nudge-every-30min') THEN
    PERFORM cron.unschedule('cart-nudge-every-30min');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'chat-quality-review-every-15min') THEN
    PERFORM cron.unschedule('chat-quality-review-every-15min');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-recurring-expenses-daily-6am-lima') THEN
    PERFORM cron.unschedule('generate-recurring-expenses-daily-6am-lima');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'retouch-reminders-daily') THEN
    PERFORM cron.unschedule('retouch-reminders-daily');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'same-day-appointment-reminder-every-15min') THEN
    PERFORM cron.unschedule('same-day-appointment-reminder-every-15min');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'silence-watchdog-every-5min') THEN
    PERFORM cron.unschedule('silence-watchdog-every-5min');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-meta-ads-spend-daily-4am-lima') THEN
    PERFORM cron.unschedule('sync-meta-ads-spend-daily-4am-lima');
  END IF;
END $$;

SELECT cron.schedule(
  'abandoned-cart-reminders',
  '*/30 * * * *',
  $$SELECT public.invoke_cron_edge_function('abandoned-cart-reminders');$$
);
SELECT cron.schedule(
  'ads-bounce-nudge-every-30min',
  '*/30 * * * *',
  $$SELECT public.invoke_cron_edge_function('ads-bounce-nudge');$$
);
SELECT cron.schedule(
  'appointment-reminders-daily',
  '0 14 * * *',
  $$SELECT public.invoke_cron_edge_function('appointment-reminders');$$
);
SELECT cron.schedule(
  'browse-reengage-every-15min',
  '*/15 * * * *',
  $$SELECT public.invoke_cron_edge_function('browse-reengage');$$
);
SELECT cron.schedule(
  'cart-nudge-every-30min',
  '*/30 * * * *',
  $$SELECT public.invoke_cron_edge_function('cart-nudge');$$
);
SELECT cron.schedule(
  'chat-quality-review-every-15min',
  '*/15 * * * *',
  $$SELECT public.invoke_cron_edge_function('chat-quality-review');$$
);
SELECT cron.schedule(
  'generate-recurring-expenses-daily-6am-lima',
  '0 11 * * *',
  $$SELECT public.invoke_cron_edge_function('generate-recurring-expenses');$$
);
SELECT cron.schedule(
  'retouch-reminders-daily',
  '0 15 * * *',
  $$SELECT public.invoke_cron_edge_function('retouch-reminders');$$
);
SELECT cron.schedule(
  'same-day-appointment-reminder-every-15min',
  '*/15 * * * *',
  $$SELECT public.invoke_cron_edge_function('same-day-appointment-reminder');$$
);
SELECT cron.schedule(
  'silence-watchdog-every-5min',
  '*/5 * * * *',
  $$SELECT public.invoke_cron_edge_function('silence-watchdog');$$
);
SELECT cron.schedule(
  'sync-meta-ads-spend-daily-4am-lima',
  '0 9 * * *',
  $$SELECT public.invoke_cron_edge_function('sync-meta-ads-spend');$$
);
