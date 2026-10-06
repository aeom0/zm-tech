-- Duplicaba a cart-nudge y enviaba sin filtro de tenant; se apaga el cron legacy.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'abandoned-cart-reminders') THEN
    PERFORM cron.unschedule('abandoned-cart-reminders');
  END IF;
END $$;
