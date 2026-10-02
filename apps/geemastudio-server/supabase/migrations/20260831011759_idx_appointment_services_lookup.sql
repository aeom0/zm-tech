-- Índices de lookup en appointment_services (Geema multi-servicio / finanzas / WABA).
-- Idempotente. No toca RLS ni CREATE TABLE (ya existen en prod ZM).
CREATE INDEX IF NOT EXISTS idx_appointment_services_appointment_id
  ON public.appointment_services (appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_services_service_id
  ON public.appointment_services (service_id);
CREATE INDEX IF NOT EXISTS idx_appointment_services_employee_id
  ON public.appointment_services (employee_id);

