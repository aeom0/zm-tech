-- Marca pública mínima del tenant para la PWA (manifest + iconos).
-- Los iconos los piden el navegador / WebAPK sin cookies de sesión (rol anon),
-- y tenant_settings solo es legible por dev/owner. Se expone únicamente la
-- proyección de marca, sin tokens WABA ni configuración interna.

CREATE OR REPLACE VIEW public.tenant_brand_public
WITH (security_invoker = false)
AS
SELECT
  tenant_slug,
  business_name,
  logo_url,
  primary_color,
  accent_color
FROM public.tenant_settings
WHERE tenant_slug IS NOT NULL;

GRANT SELECT ON public.tenant_brand_public TO anon, authenticated;
