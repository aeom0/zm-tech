-- GeemaStudio: citas multi-servicio (appointment_services) + referencias de imagen — ago 2026
-- Aplicar con: Supabase Dashboard → SQL Editor (proyecto udelxwwnyivknslueerr) o Management API.
-- NO aplicar automáticamente: revisar en PR antes de correr contra producción (tenant real ZM Lash).
-- Declarativo Drizzle: packages/shared-schema/src/schema.ts (appointmentServices, appointments.serviceIds/reference*)

-- 1) Tabla appointment_services: líneas de servicio por cita (multi-servicio + packs)
CREATE TABLE IF NOT EXISTS public.appointment_services (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id varchar NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  service_id varchar REFERENCES public.services(id),
  employee_id varchar REFERENCES public.employees(id),
  pack_id varchar REFERENCES public.packs(id),
  price numeric(10, 2) NOT NULL,
  duration integer NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointment_services_appointment_id
  ON public.appointment_services (appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_services_service_id
  ON public.appointment_services (service_id);
CREATE INDEX IF NOT EXISTS idx_appointment_services_employee_id
  ON public.appointment_services (employee_id);

ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS appointment_services_delete_roles ON public.appointment_services;
DROP POLICY IF EXISTS appointment_services_insert_roles ON public.appointment_services;
DROP POLICY IF EXISTS appointment_services_select_roles ON public.appointment_services;
DROP POLICY IF EXISTS appointment_services_update_roles ON public.appointment_services;

-- Mismo criterio que appointments: staff/dev/owner leen y escriben.
CREATE POLICY appointment_services_delete_roles ON public.appointment_services
  FOR DELETE USING (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text, 'staff'::text]));

CREATE POLICY appointment_services_insert_roles ON public.appointment_services
  FOR INSERT WITH CHECK (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text, 'staff'::text]));

CREATE POLICY appointment_services_select_roles ON public.appointment_services
  FOR SELECT USING (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text, 'staff'::text]));

CREATE POLICY appointment_services_update_roles ON public.appointment_services
  FOR UPDATE
  USING (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text, 'staff'::text]))
  WITH CHECK (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text, 'staff'::text]));

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
