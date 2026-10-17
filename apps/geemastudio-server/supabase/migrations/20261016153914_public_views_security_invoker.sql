-- Las vistas públicas dejan de ser SECURITY DEFINER (lint 0010).
-- La fila la arma una función en un schema que PostgREST no expone: misma
-- proyección de columnas, sin abrir tenant_settings. La vista corre como
-- quien consulta y, al salir de una función, ya no es auto-actualizable.

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated;

COMMENT ON SCHEMA private IS 'Helpers que no van a la API. PostgREST solo expone public.';

CREATE OR REPLACE FUNCTION private.tenant_brand_public_rows()
RETURNS TABLE (
  tenant_slug text,
  business_name text,
  logo_url text,
  primary_color text,
  accent_color text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    tenant_slug,
    business_name,
    logo_url,
    primary_color,
    accent_color
  FROM public.tenant_settings
  WHERE tenant_slug IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION private.tenant_landing_public_rows()
RETURNS TABLE (
  id uuid,
  tenant_slug text,
  slug text,
  business_name text,
  tagline text,
  custom_domain text,
  web_template text,
  currency_symbol text,
  business_hours jsonb,
  web_enabled boolean,
  web_hero_tagline text,
  web_about text,
  web_whatsapp text,
  web_instagram text,
  web_facebook text,
  web_tiktok text,
  web_address text,
  web_city text,
  web_stat_clients text,
  web_stat_rating text,
  web_stat_years text,
  web_services jsonb,
  web_reviews jsonb,
  web_hero_video_url text,
  web_salon_video_url text,
  web_hero_cta_text text,
  web_marquee_text text,
  web_marquee_speed integer,
  web_gallery jsonb,
  web_team jsonb,
  web_promos jsonb,
  web_map_embed_url text,
  web_promo_banner_url text,
  web_promo_banner_alt text,
  web_promo_banner_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION private.tenant_brand_public_rows() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.tenant_landing_public_rows() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.tenant_brand_public_rows() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.tenant_landing_public_rows() TO anon, authenticated;

DROP VIEW IF EXISTS public.tenant_brand_public;
CREATE VIEW public.tenant_brand_public
WITH (security_invoker = true) AS
SELECT
  tenant_slug,
  business_name,
  logo_url,
  primary_color,
  accent_color
FROM private.tenant_brand_public_rows();

DROP VIEW IF EXISTS public.tenant_landing_public;
CREATE VIEW public.tenant_landing_public
WITH (security_invoker = true) AS
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
FROM private.tenant_landing_public_rows();

REVOKE ALL ON public.tenant_brand_public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.tenant_landing_public FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.tenant_brand_public TO anon, authenticated;
GRANT SELECT ON public.tenant_landing_public TO anon, authenticated;
