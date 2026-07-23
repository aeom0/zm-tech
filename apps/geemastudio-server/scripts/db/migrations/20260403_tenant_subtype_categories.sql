-- GeemaStudio: businessSubtype y serviceCategories en tenant_settings
ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS business_subtype    TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS service_categories  JSONB   DEFAULT '[]'::jsonb;

COMMENT ON COLUMN tenant_settings.business_subtype   IS 'Especialización: brow-lash | nails-only | spa-full | barber-lounge | color-studio | multi-service | med-aesthetic';
COMMENT ON COLUMN tenant_settings.service_categories IS 'Array JSON de categorías de servicio activas del negocio';
