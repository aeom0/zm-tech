-- GeemaStudio — Fase 1 del plan "landing multi-tenant: base reutilizable + CMS propio"
-- Agrega columnas para secciones nuevas del template de landing (galería, equipo, promos,
-- video de hero/salón, marquesina, redes adicionales, mapa) — genérico para cualquier tenant.
-- Ejecutar en Supabase SQL Editor o: yarn db:push tras alinear Drizzle.

ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS web_hero_video_url TEXT,
  ADD COLUMN IF NOT EXISTS web_salon_video_url TEXT,
  ADD COLUMN IF NOT EXISTS web_marquee_text TEXT,
  ADD COLUMN IF NOT EXISTS web_gallery JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS web_team JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS web_promos JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS web_facebook TEXT,
  ADD COLUMN IF NOT EXISTS web_tiktok TEXT,
  ADD COLUMN IF NOT EXISTS web_map_embed_url TEXT;
