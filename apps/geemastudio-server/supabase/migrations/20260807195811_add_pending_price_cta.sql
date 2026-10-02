-- CTA de foto proactiva al cotizar precio (v3.2): "¿Te agendo el servicio ahora?"
ALTER TABLE public.whatsapp_sessions
  ADD COLUMN IF NOT EXISTS pending_price_cta_service_id varchar(36),
  ADD COLUMN IF NOT EXISTS pending_price_cta_at timestamptz;

COMMENT ON COLUMN public.whatsapp_sessions.pending_price_cta_service_id IS
  'Servicio propuesto en foto+CTA de precio (UUID). TTL vía pending_price_cta_at (~10 min).';
COMMENT ON COLUMN public.whatsapp_sessions.pending_price_cta_at IS
  'Cuándo se envió la foto+CTA de precio; si >10 min, el "Si" corto ya no aplica.';
