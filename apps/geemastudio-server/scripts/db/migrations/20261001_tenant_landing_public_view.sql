-- Vista pública para landings de tenants (GeemaStudio / ZM Lash)
-- Expone de forma segura ÚNICAMENTE las columnas necesarias para renderizar la web pública.
-- No expone tokens WABA, comisiones ni configuraciones internas de gestión.
-- Seguridad: security_invoker = false para que ejecute con permisos del creador
-- y anon solo reciba SELECT sobre esta proyección.

CREATE OR REPLACE VIEW public.tenant_landing_public
WITH (security_invoker = false)
AS
SELECT
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
FROM public.tenant_settings
WHERE web_enabled = true;

-- Permisos de lectura pública para clientes anónimos y autenticados
GRANT SELECT ON public.tenant_landing_public TO anon, authenticated;
