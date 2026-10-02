-- S2-2: tenant_settings + bridge tenant_slug → tenants.id
-- S2-6: RLS finanzas ejecutivas con filtro tenant

CREATE TABLE IF NOT EXISTS public.tenant_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL,
  business_name text NOT NULL,
  business_type text NOT NULL DEFAULT 'spa-nails',
  business_subtype text,
  service_categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  primary_color text NOT NULL DEFAULT '#7B2D8E',
  accent_color text NOT NULL DEFAULT '#D4AF37',
  currency_code text NOT NULL DEFAULT 'PEN',
  currency_symbol text NOT NULL DEFAULT 'S/',
  country text NOT NULL DEFAULT 'PE',
  language text NOT NULL DEFAULT 'es',
  timezone text NOT NULL DEFAULT 'America/Lima',
  time_format text NOT NULL DEFAULT '24',
  client_terminology text NOT NULL DEFAULT 'clienta',
  tagline text NOT NULL DEFAULT '',
  features_whatsapp boolean NOT NULL DEFAULT false,
  logo_url text NOT NULL DEFAULT '',
  staff_terminology text NOT NULL DEFAULT 'chicas',
  staff_singular_terminology text NOT NULL DEFAULT 'chica',
  appointment_terminology text NOT NULL DEFAULT 'cita',
  business_hours jsonb,
  contact_info jsonb,
  commission_staff integer NOT NULL DEFAULT 40,
  commission_house integer NOT NULL DEFAULT 60,
  is_configured boolean NOT NULL DEFAULT false,
  is_demo boolean NOT NULL DEFAULT false,
  slug text,
  web_enabled boolean NOT NULL DEFAULT false,
  web_template text NOT NULL DEFAULT 'elegant',
  custom_domain text,
  web_services jsonb DEFAULT '[]'::jsonb,
  web_reviews jsonb DEFAULT '[]'::jsonb,
  web_hero_tagline text,
  web_about text,
  web_instagram text,
  web_whatsapp text,
  web_address text,
  web_city text,
  web_stat_clients text NOT NULL DEFAULT '500+',
  web_stat_rating text NOT NULL DEFAULT '4.9',
  web_stat_years text NOT NULL DEFAULT '3+',
  waba_phone_number_id text,
  waba_access_token text,
  waba_verify_token text,
  waba_business_hours jsonb,
  waba_payment_info jsonb,
  waba_admin_phones text[],
  features_waba boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenant_settings_tenant_slug_fkey
    FOREIGN KEY (tenant_slug) REFERENCES public.tenants(id) ON DELETE CASCADE,
  CONSTRAINT tenant_settings_web_template_check
    CHECK (web_template IN ('elegant', 'warm', 'modern'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_settings_tenant_slug
  ON public.tenant_settings (tenant_slug);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_settings_slug
  ON public.tenant_settings (slug)
  WHERE slug IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_settings_custom_domain
  ON public.tenant_settings (custom_domain)
  WHERE custom_domain IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tenant_settings_web_enabled
  ON public.tenant_settings (web_enabled);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_settings_waba_phone_number_id
  ON public.tenant_settings (waba_phone_number_id)
  WHERE waba_phone_number_id IS NOT NULL;

COMMENT ON TABLE public.tenant_settings IS
  'Config extendida Geema (UUID). Puente tenant_slug → tenants.id (text Plan 02).';
COMMENT ON COLUMN public.tenant_settings.tenant_slug IS
  'Slug canónico del negocio; FK a tenants.id. 1:1 con tenants.';

-- Seed ZM Lash (idempotente)
INSERT INTO public.tenant_settings (
  tenant_slug,
  business_name,
  business_type,
  service_categories,
  primary_color,
  accent_color,
  currency_code,
  currency_symbol,
  country,
  language,
  timezone,
  time_format,
  client_terminology,
  staff_terminology,
  staff_singular_terminology,
  tagline,
  features_whatsapp,
  features_waba,
  is_configured,
  slug,
  business_hours,
  contact_info,
  waba_phone_number_id,
  web_whatsapp,
  web_address,
  web_city,
  web_instagram
)
VALUES (
  'zm-lash-nails',
  'ZM Lash & Nails Beauty',
  'spa-nails',
  '["extensiones","lifting","cejas-rostro","unas","microblading","depilacion"]'::jsonb,
  '#7B2D8E',
  '#D4AF37',
  'PEN',
  'S/',
  'PE',
  'es',
  'America/Lima',
  '24',
  'clienta',
  'chicas',
  'chica',
  'Belleza integral en Surco',
  true,
  true,
  true,
  'zm-lash-nails',
  '{"lunes":{"open":"10:00","close":"18:00"},"martes":{"open":"10:00","close":"18:00"},"miercoles":{"open":"10:00","close":"18:00"},"jueves":{"open":"10:00","close":"18:00"},"viernes":{"open":"10:00","close":"18:00"},"sabado":{"open":"10:00","close":"18:00"},"domingo":{"open":"10:30","close":"13:00"}}'::jsonb,
  '{"address":"Calle Artesanos 150, Local 205, CC. Las Plazuelas de Surco","whatsapp":"51932535512","instagram":"@zmlashandnails"}'::jsonb,
  '1013353341861346',
  '51932535512',
  'Calle Artesanos 150, Local 205, CC. Las Plazuelas de Surco',
  'Santiago de Surco',
  '@zmlashandnails'
)
ON CONFLICT (tenant_slug) DO NOTHING;

-- RLS tenant_settings
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_settings_select_own ON public.tenant_settings;
CREATE POLICY tenant_settings_select_own ON public.tenant_settings
  FOR SELECT TO authenticated
  USING (tenant_slug = public.current_tenant_id());

DROP POLICY IF EXISTS tenant_settings_update_admin ON public.tenant_settings;
CREATE POLICY tenant_settings_update_admin ON public.tenant_settings
  FOR UPDATE TO authenticated
  USING (tenant_slug = public.current_tenant_id() AND public.is_admin())
  WITH CHECK (tenant_slug = public.current_tenant_id() AND public.is_admin());

DROP POLICY IF EXISTS tenant_landing_public_read ON public.tenant_settings;
CREATE POLICY tenant_landing_public_read ON public.tenant_settings
  FOR SELECT TO anon
  USING (web_enabled = true);

GRANT SELECT ON public.tenant_settings TO authenticated;
GRANT SELECT ON public.tenant_settings TO anon;
GRANT ALL ON public.tenant_settings TO service_role;

-- S2-6: finanzas ejecutivas scoped por tenant
DROP POLICY IF EXISTS operational_expenses_admin_select ON public.operational_expenses;
CREATE POLICY operational_expenses_admin_select ON public.operational_expenses
  FOR SELECT TO authenticated
  USING (public.is_admin() AND tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS operational_expenses_admin_insert ON public.operational_expenses;
CREATE POLICY operational_expenses_admin_insert ON public.operational_expenses
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS operational_expenses_admin_update ON public.operational_expenses;
CREATE POLICY operational_expenses_admin_update ON public.operational_expenses
  FOR UPDATE TO authenticated
  USING (public.is_admin() AND tenant_id = public.current_tenant_id())
  WITH CHECK (public.is_admin() AND tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS operational_expenses_admin_delete ON public.operational_expenses;
CREATE POLICY operational_expenses_admin_delete ON public.operational_expenses
  FOR DELETE TO authenticated
  USING (public.is_admin() AND tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS recurring_expense_templates_admin_select ON public.recurring_expense_templates;
CREATE POLICY recurring_expense_templates_admin_select ON public.recurring_expense_templates
  FOR SELECT TO authenticated
  USING (public.is_admin() AND tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS meta_ads_spend_daily_admin_select ON public.meta_ads_spend_daily;
CREATE POLICY meta_ads_spend_daily_admin_select ON public.meta_ads_spend_daily
  FOR SELECT TO authenticated
  USING (public.is_admin() AND tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS meta_ads_sync_log_admin_select ON public.meta_ads_sync_log;
CREATE POLICY meta_ads_sync_log_admin_select ON public.meta_ads_sync_log
  FOR SELECT TO authenticated
  USING (public.is_admin() AND tenant_id = public.current_tenant_id());
