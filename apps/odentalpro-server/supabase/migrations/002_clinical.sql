-- 002_clinical.sql
-- NO APLICAR hasta Fase 1 (probar en branch o supabase start local primero).
-- NUNCA tocar la tabla contacts ni sus policies.

CREATE TABLE odental_clinical_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES odental_tenant_settings(id),
  patient_id  UUID NOT NULL REFERENCES odental_patients(id),
  appointment_id UUID REFERENCES odental_appointments(id),
  dentist_id  UUID REFERENCES odental_employees(id),
  visit_date  TIMESTAMPTZ NOT NULL DEFAULT now(),
  chief_complaint TEXT,
  diagnosis   TEXT,
  treatment_performed TEXT,
  treatment_plan TEXT,
  observations TEXT,
  odontogram  JSONB,
  attachments JSONB DEFAULT '[]',
  consent_signed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE odental_treatment_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES odental_tenant_settings(id),
  patient_id      UUID NOT NULL REFERENCES odental_patients(id),
  dentist_id      UUID REFERENCES odental_employees(id),
  name            TEXT NOT NULL,
  total_sessions  INT,
  total_cost      NUMERIC(10,2),
  amount_paid     NUMERIC(10,2) DEFAULT 0,
  status          TEXT DEFAULT 'active',
  start_date      DATE,
  estimated_end   DATE,
  notes           TEXT,
  sessions        JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE odental_consent_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES odental_tenant_settings(id),
  procedure_type TEXT NOT NULL, -- extraccion | implante | ortodoncia | blanqueamiento
  body_template TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE odental_clinical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE odental_treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE odental_consent_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY odental_tenant_isolation_clinical ON odental_clinical_records
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
CREATE POLICY odental_tenant_isolation_plans ON odental_treatment_plans
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
CREATE POLICY odental_tenant_isolation_consent ON odental_consent_templates
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- FKs diferidas desde appointments
ALTER TABLE odental_appointments
  ADD CONSTRAINT odental_appointments_clinical_record_fk
  FOREIGN KEY (clinical_record_id) REFERENCES odental_clinical_records(id);

ALTER TABLE odental_appointments
  ADD CONSTRAINT odental_appointments_treatment_plan_fk
  FOREIGN KEY (treatment_plan_id) REFERENCES odental_treatment_plans(id);
