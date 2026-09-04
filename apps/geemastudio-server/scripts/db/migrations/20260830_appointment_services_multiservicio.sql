-- GeemaStudio: citas multi-servicio (appointment_services) + referencias de imagen — ago 2026
-- Aplicar con: Supabase Dashboard → SQL Editor (proyecto udelxwwnyivknslueerr) o Management API.
-- NO aplicar automáticamente: revisar en PR antes de correr contra producción (tenant real ZM Lash).
-- Declarativo Drizzle: packages/shared-schema/src/schema.ts (appointmentServices, appointments.serviceIds/reference*)

-- 1) Tabla appointment_services: líneas de servicio por cita (multi-servicio + packs)
-- NOTA (2026-08-31): en producción (udelxwwnyivknslueerr) esta tabla ya existía, creada
-- originalmente en ZM-Lash-and-Nails-Beauty, con `tenant_id` agregado por el retrofit
-- multi-tenant (20260807133011_tenant_id_retrofit.sql) y políticas RLS ya tenant-scoped
-- (20260808002956_tenant_rls_policies_part2_66_policies.sql, usa tenant_id = current_tenant_id(),
-- no `get_my_role()` — esa función no existe en producción). Este CREATE TABLE queda IF NOT EXISTS
-- solo para entornos nuevos; la sección de RLS se elimina para no duplicar/contradecir las
-- políticas reales ya vigentes.
CREATE TABLE IF NOT EXISTS public.appointment_services (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id varchar NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  service_id varchar REFERENCES public.services(id),
  employee_id varchar REFERENCES public.employees(id),
  pack_id varchar REFERENCES public.packs(id),
  price numeric(10, 2) NOT NULL,
  duration integer NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  tenant_id text NOT NULL DEFAULT 'zm-lash-nails'
);

CREATE INDEX IF NOT EXISTS idx_appointment_services_appointment_id
  ON public.appointment_services (appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_services_service_id
  ON public.appointment_services (service_id);
CREATE INDEX IF NOT EXISTS idx_appointment_services_employee_id
  ON public.appointment_services (employee_id);
CREATE INDEX IF NOT EXISTS idx_appointment_services_tenant_id
  ON public.appointment_services (tenant_id);

ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;

-- 2) appointments: columnas para service_ids denormalizado + referencias de imagen
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'service_ids'
  ) THEN
    ALTER TABLE public.appointments ADD COLUMN service_ids text[];
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'appointments'
      AND column_name = 'reference_image_paths'
  ) THEN
    ALTER TABLE public.appointments ADD COLUMN reference_image_paths text[];
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'appointments'
      AND column_name = 'reference_received_at'
  ) THEN
    ALTER TABLE public.appointments ADD COLUMN reference_received_at timestamp;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'appointments'
      AND column_name = 'reference_reviewed_at'
  ) THEN
    ALTER TABLE public.appointments ADD COLUMN reference_reviewed_at timestamp;
  END IF;
END $$;
