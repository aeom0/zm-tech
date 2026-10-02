-- Endurece los privilegios del rol anon en public (validación Corte 1, 2-oct-2026).
--
-- Contexto: Supabase concede ALL a anon/authenticated sobre todo objeto nuevo de
-- public. RLS frena las tablas, pero:
--   1. Las vistas tenant_brand_public y tenant_landing_public son simples
--      (auto-actualizables), security_invoker = false y propiedad de postgres:
--      con INSERT/UPDATE/DELETE concedidos, anon/authenticated escribirían
--      sobre tenant_settings saltándose RLS.
--   2. anon conservaba INSERT/UPDATE/DELETE/TRUNCATE sobre ~46 tablas (WABA,
--      tenant_settings, push_tokens, ...), protegidas solo por RLS.
--   3. tenant_landing_public_read deja a anon leer la fila completa de un
--      tenant con web_enabled = true, incluidas columnas waba_*.
--
-- Efecto: anon no escribe nada; solo lee las dos vistas y las columnas web de
-- tenant_settings que usa la landing de Geema (cliente anon en
-- apps/geemastudio-web/src/lib/tenant-landing-service.ts).
-- authenticated no se toca en tablas (lo gobierna RLS), solo pierde escritura
-- sobre las dos vistas.

-- 1. Vistas públicas: solo lectura.
REVOKE ALL ON public.tenant_brand_public FROM anon, authenticated;
REVOKE ALL ON public.tenant_landing_public FROM anon, authenticated;
GRANT SELECT ON public.tenant_brand_public TO anon, authenticated;
GRANT SELECT ON public.tenant_landing_public TO anon, authenticated;

-- 2. anon sin privilegios sobre tablas, secuencias y funciones por defecto.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- Las vistas se vuelven a abrir para lectura (el REVOKE de arriba las incluyó).
GRANT SELECT ON public.tenant_brand_public TO anon;
GRANT SELECT ON public.tenant_landing_public TO anon;

-- 3. Lectura anon de tenant_settings acotada a columnas de contenido web.
GRANT SELECT (
  id,
  tenant_slug,
  slug,
  business_name,
  tagline,
  custom_domain,
  web_template,
  currency_symbol,
  business_hours,
  web_enabled,
  web_hero_tagline,
  web_about,
  web_whatsapp,
  web_instagram,
  web_facebook,
  web_tiktok,
  web_address,
  web_city,
  web_stat_clients,
  web_stat_rating,
  web_stat_years,
  web_services,
  web_reviews,
  web_hero_video_url,
  web_salon_video_url,
  web_hero_cta_text,
  web_marquee_text,
  web_marquee_speed,
  web_gallery,
  web_team,
  web_promos,
  web_map_embed_url,
  web_promo_banner_url,
  web_promo_banner_alt,
  web_promo_banner_active,
  created_at,
  updated_at
) ON public.tenant_settings TO anon;

-- 4. Objetos futuros no se abren a anon automáticamente.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
