ALTER TABLE public.waba_config DROP CONSTRAINT IF EXISTS waba_config_config_key_key;
CREATE UNIQUE INDEX IF NOT EXISTS waba_config_tenant_config_key_unique
  ON public.waba_config (tenant_id, config_key);

ALTER TABLE public.waba_config DROP CONSTRAINT IF EXISTS waba_config_category_check;
ALTER TABLE public.waba_config ADD CONSTRAINT waba_config_category_check
  CHECK (category = ANY (ARRAY[
    'campanas'::text,
    'mensajes'::text,
    'haiku'::text,
    'historial'::text,
    'portafolio'::text,
    'sistema'::text
  ]));

INSERT INTO public.waba_config (
  tenant_id, config_key, label, category, config_value, is_active, sort_order
) VALUES (
  'zm-lash-nails',
  'waba_tenant_routing_enabled',
  'Routing multi-tenant WABA (Sprint 3)',
  'sistema',
  '{"enabled": false}'::jsonb,
  true,
  999
)
ON CONFLICT (tenant_id, config_key) DO NOTHING;
