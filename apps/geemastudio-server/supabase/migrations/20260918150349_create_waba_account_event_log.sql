-- Log de webhooks Meta account/phone (name_update, quality_update, account_update).
-- Solo escritura service_role (Edge); lectura admins.

CREATE TABLE IF NOT EXISTS public.waba_account_event_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  tenant_id text NOT NULL DEFAULT 'zm-lash-nails',
  phone_number_id text,
  waba_id text,
  field text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

COMMENT ON TABLE public.waba_account_event_log IS
  'Eventos webhook Meta (phone_number_name_update, phone_number_quality_update, account_update). Persistidos para auditar display name / calidad / cuenta.';

CREATE INDEX IF NOT EXISTS waba_account_event_log_created_at_idx
  ON public.waba_account_event_log (created_at DESC);

CREATE INDEX IF NOT EXISTS waba_account_event_log_tenant_field_idx
  ON public.waba_account_event_log (tenant_id, field, created_at DESC);

ALTER TABLE public.waba_account_event_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admins_select_waba_account_event_log ON public.waba_account_event_log;
CREATE POLICY admins_select_waba_account_event_log
  ON public.waba_account_event_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('dev', 'owner')
    )
  );

REVOKE ALL ON TABLE public.waba_account_event_log FROM PUBLIC;
REVOKE ALL ON TABLE public.waba_account_event_log FROM anon;
GRANT SELECT ON TABLE public.waba_account_event_log TO authenticated;
GRANT ALL ON TABLE public.waba_account_event_log TO service_role;
