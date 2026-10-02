-- Al reprogramar (app ZM, app Geema o bot), la hora nueva debe volver a
-- recibir recordatorio 24 h y del mismo día. El cron solo envía si el flag
-- está vacío; antes se conservaba el del horario viejo.
-- El reintento del mismo día vive en ZM: supabase/functions/same-day-appointment-reminder
-- (runtime WABA compartido, proyecto udelxwwnyivknslueerr).
CREATE OR REPLACE FUNCTION public.reset_appointment_reminders_on_date_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.date IS DISTINCT FROM OLD.date THEN
    NEW.reminder_sent_at := NULL;
    NEW.same_day_reminder_sent_at := NULL;
    NEW.client_confirmed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reset_appointment_reminders_on_date_change ON public.appointments;

CREATE TRIGGER trg_reset_appointment_reminders_on_date_change
BEFORE UPDATE OF date ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.reset_appointment_reminders_on_date_change();

COMMENT ON FUNCTION public.reset_appointment_reminders_on_date_change() IS
  'Al cambiar appointments.date (reprogramar desde app ZM, app Geema o bot WABA), limpia reminder_sent_at, same_day_reminder_sent_at y client_confirmed_at para que los crons vuelvan a enviar la plantilla de la hora nueva.';
