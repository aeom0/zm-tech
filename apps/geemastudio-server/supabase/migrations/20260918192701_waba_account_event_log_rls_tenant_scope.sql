DROP POLICY IF EXISTS admins_select_waba_account_event_log ON public.waba_account_event_log;
CREATE POLICY admins_select_waba_account_event_log
  ON public.waba_account_event_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          p.role = 'dev'
          OR (p.role = 'owner' AND p.tenant_id = waba_account_event_log.tenant_id)
        )
    )
  );
