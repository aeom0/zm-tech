-- Plan 17 — El uso WABA del panel depende de waba_pricing_daily; el sync semanal dejaba la barra
-- hasta 7 días atrasada. Pasa a diario (06:00 Lima). Cada corrida pide 8 días con upsert: es idempotente.
SELECT cron.unschedule('waba-pricing-sync-weekly-mon-6am-lima');
SELECT cron.schedule('waba-pricing-sync-daily-6am-lima', '0 11 * * *', 'SELECT public.invoke_waba_pricing_sync();');
