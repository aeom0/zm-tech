-- Al crear una cita scheduled, avisa por WhatsApp a carritos que tenían esa hora en espera de abono.
CREATE OR REPLACE FUNCTION public.notify_held_slot_on_appointment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'vault'
AS $function$
DECLARE
  v_secret text;
  v_request_id bigint;
BEGIN
  IF NEW.status IS DISTINCT FROM 'scheduled' THEN
    RETURN NEW;
  END IF;

  BEGIN
    SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets
    WHERE name = 'cron_secret'
    LIMIT 1;

    IF coalesce(v_secret, '') = '' THEN
      RAISE WARNING '[notify_held_slot_on_appointment] falta vault cron_secret';
      RETURN NEW;
    END IF;

    SELECT net.http_post(
      url := 'https://udelxwwnyivknslueerr.supabase.co/functions/v1/held-slot-watch',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_secret
      ),
      body := jsonb_build_object('appointment_id', NEW.id),
      timeout_milliseconds := 60000
    )
    INTO v_request_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[notify_held_slot_on_appointment] %', SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_held_slot ON public.appointments;

CREATE TRIGGER trg_notify_held_slot
AFTER INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.notify_held_slot_on_appointment();

COMMENT ON FUNCTION public.notify_held_slot_on_appointment() IS
  'Al crear una cita scheduled, avisa por WhatsApp (held-slot-watch) a carritos que tenían esa hora en espera de abono. Auth: Vault cron_secret.';
