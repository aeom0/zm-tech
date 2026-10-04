-- Días de aviso por profesional. 0 = se puede agendar el mismo día.
-- El motor de cupos (bot y horarios) no ofrece a quien pide aviso si la fecha
-- es anterior a hoy + booking_lead_days, en la zona del negocio.
-- Asignar a mano no usa este filtro.

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS booking_lead_days smallint NOT NULL DEFAULT 0;

ALTER TABLE public.employees
  DROP CONSTRAINT IF EXISTS employees_booking_lead_days_range;

ALTER TABLE public.employees
  ADD CONSTRAINT employees_booking_lead_days_range
  CHECK (booking_lead_days BETWEEN 0 AND 30);

COMMENT ON COLUMN public.employees.booking_lead_days IS
  'Días de anticipación para citas nuevas. 0 = hoy. 1 = desde mañana. No aplica al asignar a mano.';
