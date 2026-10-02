ALTER TABLE public.waba_pricing_sync_log DROP CONSTRAINT IF EXISTS waba_pricing_sync_log_status_check;
ALTER TABLE public.waba_pricing_sync_log ADD CONSTRAINT waba_pricing_sync_log_status_check
  CHECK (status = ANY (ARRAY['success'::text, 'error'::text, 'partial'::text]));
