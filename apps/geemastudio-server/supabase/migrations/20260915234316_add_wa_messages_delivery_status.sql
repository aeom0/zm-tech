ALTER TABLE public.wa_messages
  ADD COLUMN IF NOT EXISTS delivery_status text,
  ADD COLUMN IF NOT EXISTS delivery_status_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_error text;

COMMENT ON COLUMN public.wa_messages.delivery_status IS
  'Estado Meta del mensaje saliente: accepted|sent|delivered|read|failed (null = legacy / inbound)';
COMMENT ON COLUMN public.wa_messages.delivery_status_at IS
  'Timestamp del ultimo status Meta aplicado';
COMMENT ON COLUMN public.wa_messages.delivery_error IS
  'Detalle si delivery_status=failed (code/title Meta)';

CREATE INDEX IF NOT EXISTS wa_messages_wamid_idx
  ON public.wa_messages (wamid)
  WHERE wamid IS NOT NULL;

UPDATE public.wa_messages
SET delivery_status = 'accepted',
    delivery_status_at = created_at
WHERE direction = 'out'
  AND wamid IS NOT NULL
  AND delivery_status IS NULL
  AND created_at > now() - interval '30 days';
