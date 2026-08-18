-- Marcas con las que trabaja la tienda (selector en Configuración de tienda).
-- Array vacío = sin filtro, la tienda trabaja con todas las marcas del seed.
-- Alcance: SOLO columna nueva en public.repmax_stores.
-- Confirmado por Alberto (chat 2026-08-18): selector de marcas en la misma
-- configuración del catálogo persistente de marca/modelo/años.

ALTER TABLE public.repmax_stores
  ADD COLUMN IF NOT EXISTS preferred_brands text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.repmax_stores.preferred_brands IS
  'Subconjunto de BRANDS (constants/brands.ts) con el que trabaja la tienda. Vacío = todas.';
