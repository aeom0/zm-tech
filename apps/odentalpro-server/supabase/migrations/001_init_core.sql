-- 001_init_core.sql
-- Prefijo odental_ obligatorio: este proyecto también sirve la tabla `contacts` de la landing.
-- NO APLICAR hasta Fase 1 (probar en branch o supabase start local primero).
-- NUNCA tocar la tabla contacts ni sus policies.

CREATE TABLE odental_tenant_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,
  clinic_name     TEXT NOT NULL,
  business_subtype TEXT DEFAULT 'general', -- general | orthodontics | pediatric | implants
  theme_override  JSONB DEFAULT '{}',
  currency_code   TEXT DEFAULT 'USD',
  timezone        TEXT DEFAULT 'America/Caracas',
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE odental_employees (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES odental_tenant_settings(id),
  role        TEXT NOT NULL, -- dev | dentist-owner | assistant | specialist
  specialty   TEXT,          -- Odontología General, Ortodoncia, Endodoncia...
  full_name   TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE odental_patients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES odental_tenant_settings(id),
  full_name     TEXT NOT NULL,
  phone         TEXT,
  birth_date    DATE,
  blood_type    TEXT,
  allergies     TEXT,
  medical_notes TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE odental_appointments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES odental_tenant_settings(id),
  patient_id         UUID NOT NULL REFERENCES odental_patients(id),
  dentist_id         UUID REFERENCES odental_employees(id),
  clinical_record_id UUID,  -- FK agregada en 002
  treatment_plan_id  UUID,  -- FK agregada en 002
  scheduled_at       TIMESTAMPTZ NOT NULL,
  status             TEXT DEFAULT 'scheduled',
  created_at         TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE odental_tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE odental_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE odental_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE odental_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY odental_tenant_isolation_patients ON odental_patients
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
CREATE POLICY odental_tenant_isolation_appointments ON odental_appointments
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
CREATE POLICY odental_tenant_isolation_employees ON odental_employees
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
-- service_role bypassa RLS por diseño — no hace falta policy explícita para ese rol.
