-- Plan 17 Fase 4 — Límites WABA en mensajes de servicio reales (pricing Meta 1-oct-2026).
-- Unidad: SERVICE/FREE_CUSTOMER_SERVICE de waba_pricing_daily (excluye FREE_ENTRY_POINT).
-- La columna conserva el nombre waba_conversations por compatibilidad con landing, web y mobile.

UPDATE public.plans SET
  waba_conversations = 300,
  waba_features = '["WhatsApp 24/7 con asistente IA","300 mensajes de servicio/mes incluidos"]'::jsonb
WHERE code = 'basic';

UPDATE public.plans SET
  waba_conversations = 1000,
  waba_features = '["WhatsApp 24/7 con asistente IA","1.000 mensajes de servicio/mes incluidos","Envío de promos masivas por WA"]'::jsonb
WHERE code = 'pro';

UPDATE public.plans SET
  waba_features = '["WhatsApp 24/7 con asistente IA avanzada","Mensajes de servicio ilimitados","Flujo de pago por captura WA","Foto previa al servicio por WA"]'::jsonb
WHERE code = 'elite';

-- Uso del mes en curso (hora de Lima) del tenant del JWT.
-- security_invoker: waba_pricing_daily solo la leen owner/dev del tenant (RLS); otros roles ven 0.
CREATE OR REPLACE VIEW public.tenant_waba_usage
WITH (security_invoker = true)
AS
SELECT
  t.id AS tenant_id,
  date_trunc('month', (now() AT TIME ZONE 'America/Lima'))::date AS month_start,
  COALESCE((
    SELECT sum(d.volume)
    FROM public.waba_pricing_daily d
    WHERE d.tenant_id = t.id
      AND d.pricing_category = 'SERVICE'
      AND d.pricing_type = 'FREE_CUSTOMER_SERVICE'
      AND d.date >= date_trunc('month', (now() AT TIME ZONE 'America/Lima'))::date
  ), 0)::integer AS service_messages,
  (SELECT max(d.date) FROM public.waba_pricing_daily d WHERE d.tenant_id = t.id) AS data_through
FROM public.tenants t
WHERE t.id = public.current_tenant_id();

REVOKE ALL ON public.tenant_waba_usage FROM anon, authenticated;
GRANT SELECT ON public.tenant_waba_usage TO authenticated;
GRANT ALL ON public.tenant_waba_usage TO service_role;
