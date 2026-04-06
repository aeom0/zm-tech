-- ============================================================
-- PR-10: WABA multi-tenant — tablas y columnas nuevas
-- ============================================================

-- 1. Columnas WABA en tenant_settings
ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS waba_phone_number_id   TEXT        NULL,
  ADD COLUMN IF NOT EXISTS waba_access_token       TEXT        NULL,
  ADD COLUMN IF NOT EXISTS waba_verify_token       TEXT        NULL,
  ADD COLUMN IF NOT EXISTS waba_business_hours     JSONB       NULL,
  ADD COLUMN IF NOT EXISTS waba_payment_info       JSONB       NULL,
  ADD COLUMN IF NOT EXISTS waba_admin_phones       TEXT[]      NULL,
  ADD COLUMN IF NOT EXISTS features_waba           BOOLEAN     NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_settings_waba_phone_number_id
  ON public.tenant_settings (waba_phone_number_id)
  WHERE waba_phone_number_id IS NOT NULL;

-- 2. Tabla waba_config (configurable por tenant desde CMS)
CREATE TABLE IF NOT EXISTS public.waba_config (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES public.tenant_settings(id) ON DELETE CASCADE,
  config_key    TEXT        NOT NULL,
  config_value  JSONB       NOT NULL DEFAULT '{}',
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, config_key)
);
CREATE INDEX IF NOT EXISTS idx_waba_config_tenant ON public.waba_config (tenant_id, is_active);

-- 3. Tabla whatsapp_sessions (sesión de carrito por usuario + tenant)
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID        NOT NULL REFERENCES public.tenant_settings(id) ON DELETE CASCADE,
  phone                    TEXT        NOT NULL,
  step                     TEXT        NOT NULL DEFAULT 'start',
  cart_items               JSONB       NULL,
  cart_service_ids         JSONB       NULL,
  parsed_datetime          TIMESTAMPTZ NULL,
  employee_assignments     JSONB       NULL,
  awaiting_screenshot      BOOLEAN     NOT NULL DEFAULT FALSE,
  pre_service_photo_url    TEXT        NULL,
  pre_service_photo_url_2  TEXT        NULL,
  pre_service_photo_requested BOOLEAN  NOT NULL DEFAULT FALSE,
  pending_photo_areas      TEXT        NULL,
  verification_id          UUID        NULL,
  nudge1_sent_at           TIMESTAMPTZ NULL,
  nudge2_sent_at           TIMESTAMPTZ NULL,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, phone)
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_tenant_phone
  ON public.whatsapp_sessions (tenant_id, phone);

-- 4. Tabla wa_messages (historial de chat por tenant)
CREATE TABLE IF NOT EXISTS public.wa_messages (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        NOT NULL REFERENCES public.tenant_settings(id) ON DELETE CASCADE,
  phone        TEXT        NOT NULL,
  direction    TEXT        NOT NULL CHECK (direction IN ('in', 'out')),
  msg_type     TEXT        NOT NULL DEFAULT 'text',
  content      TEXT        NOT NULL,
  step_before  TEXT        NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wa_messages_tenant_phone
  ON public.wa_messages (tenant_id, phone, created_at DESC);

-- 5. RLS — habilitar en las tablas nuevas
ALTER TABLE public.waba_config      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_messages      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only_waba_config"
  ON public.waba_config FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_only_sessions"
  ON public.whatsapp_sessions FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_only_wa_messages"
  ON public.wa_messages FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- Trigger updated_at en sessions
CREATE OR REPLACE FUNCTION public.update_whatsapp_session_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_whatsapp_sessions_updated_at ON public.whatsapp_sessions;
CREATE TRIGGER trg_whatsapp_sessions_updated_at
  BEFORE UPDATE ON public.whatsapp_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_whatsapp_session_updated_at();

-- ============================================================
-- 6. Aislamiento multi-tenant para catálogo y citas (Edge WABA)
-- ============================================================

ALTER TABLE public.service_categories
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_settings(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_service_categories_tenant ON public.service_categories(tenant_id);

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_settings(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_services_tenant ON public.services(tenant_id);

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_settings(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_employees_tenant ON public.employees(tenant_id);

ALTER TABLE public.packs
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_settings(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_packs_tenant ON public.packs(tenant_id);

ALTER TABLE public.promotions
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_settings(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_promotions_tenant ON public.promotions(tenant_id);

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_settings(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS phone_country TEXT,
  ADD COLUMN IF NOT EXISTS phone_normalized TEXT;
CREATE INDEX IF NOT EXISTS idx_clients_tenant ON public.clients(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_tenant_phone_norm
  ON public.clients (tenant_id, phone_country, phone_normalized)
  WHERE tenant_id IS NOT NULL AND phone_country IS NOT NULL AND phone_normalized IS NOT NULL;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_settings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS service_ids JSONB,
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;
CREATE INDEX IF NOT EXISTS idx_appointments_tenant ON public.appointments(tenant_id);

CREATE TABLE IF NOT EXISTS public.appointment_services (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  VARCHAR NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  service_id      VARCHAR NOT NULL REFERENCES public.services(id),
  pack_id         VARCHAR REFERENCES public.packs(id) ON DELETE SET NULL,
  employee_id     VARCHAR REFERENCES public.employees(id) ON DELETE SET NULL,
  price           NUMERIC(10,2) NOT NULL,
  duration        INTEGER NOT NULL DEFAULT 60,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_appointment_services_appt ON public.appointment_services(appointment_id);

ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only_appointment_services"
  ON public.appointment_services FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- Uso de IA (rate limit por tenant + hash de teléfono)
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES public.tenant_settings(id) ON DELETE CASCADE,
  trigger_type   TEXT NOT NULL,
  input_tokens   INTEGER NOT NULL DEFAULT 0,
  output_tokens  INTEGER NOT NULL DEFAULT 0,
  phone_hash     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_usage_tenant_hash_time
  ON public.ai_usage_log (tenant_id, phone_hash, created_at DESC);

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only_ai_usage_log"
  ON public.ai_usage_log FOR ALL
  TO service_role USING (true) WITH CHECK (true);
