-- Plan 18 — Fase 1: modelo de datos de disponibilidad por profesional.
-- Agrega servicios, horarios, ausencias y coberturas por profesional.
-- Sin cambios de comportamiento: todas las profesionales quedan con does_all_services = true
-- y sin horarios propios (heredan el del negocio).

-- 1. Bandera "hace todos los servicios" (default = comportamiento actual).
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS does_all_services boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.employees.does_all_services IS
  'true = hace todos los servicios (incluidos nuevos). false = solo los de employee_services.';

-- 2. Servicios por profesional.
CREATE TABLE IF NOT EXISTS public.employee_services (
  tenant_id   text NOT NULL DEFAULT public.current_tenant_id(),
  employee_id character varying NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  service_id  character varying NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (employee_id, service_id)
);
CREATE INDEX IF NOT EXISTS idx_employee_services_tenant_service
  ON public.employee_services (tenant_id, service_id);

-- 3. Horario semanal por profesional (varias filas por día = turno partido).
CREATE TABLE IF NOT EXISTS public.employee_work_hours (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   text NOT NULL DEFAULT public.current_tenant_id(),
  employee_id character varying NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  weekday     smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time  time NOT NULL,
  end_time    time NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT employee_work_hours_range CHECK (end_time > start_time)
);
CREATE INDEX IF NOT EXISTS idx_employee_work_hours_emp
  ON public.employee_work_hours (tenant_id, employee_id, weekday);

-- 4. Ausencias (vacaciones, permiso, enfermedad, etc.).
CREATE TABLE IF NOT EXISTS public.employee_time_off (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   text NOT NULL DEFAULT public.current_tenant_id(),
  employee_id character varying NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  kind        text NOT NULL DEFAULT 'other'
              CHECK (kind IN ('vacation','permission','sick_leave','personal','training','day_off','other')),
  date_from   date NOT NULL,
  date_to     date,                 -- null = hasta nuevo aviso
  start_time  time,                 -- null junto con end_time = día completo
  end_time    time,
  reason      text,
  is_paid     boolean,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT employee_time_off_dates CHECK (date_to IS NULL OR date_to >= date_from),
  CONSTRAINT employee_time_off_times CHECK (
    (start_time IS NULL AND end_time IS NULL)
    OR (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
  )
);
CREATE INDEX IF NOT EXISTS idx_employee_time_off_emp_dates
  ON public.employee_time_off (tenant_id, employee_id, date_from, date_to);

-- 5. Coberturas: la cubierta queda ausente todo el día y la cubridora hereda sus servicios.
CREATE TABLE IF NOT EXISTS public.employee_coverages (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             text NOT NULL DEFAULT public.current_tenant_id(),
  covered_employee_id   character varying NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  covering_employee_id  character varying NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date_from             date NOT NULL,
  date_to               date NOT NULL,
  note                  text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT employee_coverages_distinct CHECK (covered_employee_id <> covering_employee_id),
  CONSTRAINT employee_coverages_dates CHECK (date_to >= date_from)
);
CREATE INDEX IF NOT EXISTS idx_employee_coverages_dates
  ON public.employee_coverages (tenant_id, date_from, date_to);

-- 6. RLS: lectura por tenant, escritura solo admin del tenant (igual que salon_holidays).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['employee_services','employee_work_hours','employee_time_off','employee_coverages']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS "%1$s select tenant" ON public.%1$I', t);
    EXECUTE format(
      'CREATE POLICY "%1$s select tenant" ON public.%1$I FOR SELECT USING (tenant_id = public.current_tenant_id())', t);

    EXECUTE format('DROP POLICY IF EXISTS "%1$s insert admin" ON public.%1$I', t);
    EXECUTE format(
      'CREATE POLICY "%1$s insert admin" ON public.%1$I FOR INSERT WITH CHECK (public.is_admin() AND tenant_id = public.current_tenant_id())', t);

    EXECUTE format('DROP POLICY IF EXISTS "%1$s update admin" ON public.%1$I', t);
    EXECUTE format(
      'CREATE POLICY "%1$s update admin" ON public.%1$I FOR UPDATE USING (public.is_admin() AND tenant_id = public.current_tenant_id()) WITH CHECK (public.is_admin() AND tenant_id = public.current_tenant_id())', t);

    EXECUTE format('DROP POLICY IF EXISTS "%1$s delete admin" ON public.%1$I', t);
    EXECUTE format(
      'CREATE POLICY "%1$s delete admin" ON public.%1$I FOR DELETE USING (public.is_admin() AND tenant_id = public.current_tenant_id())', t);

    -- anon sin acceso (ver 20261002120954_revoke_anon_table_grants)
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
  END LOOP;
END $$;
