-- GeemaStudio Fase 16 — Landing públicas por tenant (slug + plantilla)
-- Ejecutar en Supabase SQL Editor o: yarn db:push tras alinear Drizzle
-- Nota: PostgreSQL no soporta CREATE POLICY IF NOT EXISTS; usar DROP + CREATE.

ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS web_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS web_template TEXT NOT NULL DEFAULT 'elegant',
  ADD COLUMN IF NOT EXISTS custom_domain TEXT,
  ADD COLUMN IF NOT EXISTS web_services JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS web_reviews JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS web_hero_tagline TEXT,
  ADD COLUMN IF NOT EXISTS web_about TEXT,
  ADD COLUMN IF NOT EXISTS web_instagram TEXT,
  ADD COLUMN IF NOT EXISTS web_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS web_address TEXT,
  ADD COLUMN IF NOT EXISTS web_city TEXT,
  ADD COLUMN IF NOT EXISTS web_stat_clients TEXT NOT NULL DEFAULT '500+',
  ADD COLUMN IF NOT EXISTS web_stat_rating TEXT NOT NULL DEFAULT '4.9',
  ADD COLUMN IF NOT EXISTS web_stat_years TEXT NOT NULL DEFAULT '3+';

-- CHECK web_template (omitir si la columna ya existía sin constraint)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tenant_settings_web_template_check'
  ) THEN
    ALTER TABLE public.tenant_settings
      ADD CONSTRAINT tenant_settings_web_template_check
      CHECK (web_template IN ('elegant', 'warm', 'modern'));
  END IF;
END $$;

-- Índices únicos: en PostgreSQL varias filas con slug/custom_domain NULL están permitidas
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_settings_slug
  ON public.tenant_settings (slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_settings_custom_domain
  ON public.tenant_settings (custom_domain);
CREATE INDEX IF NOT EXISTS idx_tenant_settings_web_enabled ON public.tenant_settings (web_enabled);

-- Lectura pública solo con rol anon (clave anon de Supabase en Next.js)
DROP POLICY IF EXISTS tenant_landing_public_read ON public.tenant_settings;
CREATE POLICY tenant_landing_public_read ON public.tenant_settings
  FOR SELECT TO anon
  USING (web_enabled = true);

-- Seed de prueba (opcional; ajustar WHERE a tu fila)
-- UPDATE public.tenant_settings SET slug = 'demo-salon', web_enabled = true, web_template = 'elegant' WHERE id = '...';
