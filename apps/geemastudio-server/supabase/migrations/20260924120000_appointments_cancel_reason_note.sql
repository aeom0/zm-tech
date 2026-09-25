-- Cancelación con motivo: la cita se marca 'cancelled' en lugar de borrarse.
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS cancel_note text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamp without time zone;
