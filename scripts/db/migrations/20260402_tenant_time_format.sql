-- SalonPro: preferencia 12h / 24h para la agenda (tenant_settings.time_format)
ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS time_format text NOT NULL DEFAULT '24';

COMMENT ON COLUMN tenant_settings.time_format IS '12 | 24 — formato de visualización de horas en la app';
