-- Contador de taps consecutivos de navegación pura de catálogo (sin seleccionar
-- servicio/pack concreto ni agregar al carrito). Al llegar al umbral, el bot
-- ofrece cotizar por texto en vez de reenviar otra lista (caso Jerita PE...8523,
-- laberinto de listas vía taps, docs/waba/analysis/2026-09-17-analysis.md).
-- Idempotente.

ALTER TABLE public.whatsapp_sessions
  ADD COLUMN IF NOT EXISTS catalog_nav_taps_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.whatsapp_sessions.catalog_nav_taps_count IS
  'Taps consecutivos de navegación pura de catálogo (subcategoría/categoría/ver más/volver) sin seleccionar un ítem concreto. Se resetea a 0 al agregar algo al carrito o al hacer un tap distinto; al llegar al umbral se ofrece cotizar por texto libre.';
