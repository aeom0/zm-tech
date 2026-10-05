-- Concepto explícito del pago: adelanto (cupo), servicio o producto (retail).
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS kind text
  CONSTRAINT payments_kind_check CHECK (kind IN ('deposit', 'service', 'product'));

COMMENT ON COLUMN public.payments.kind IS
  'deposit = adelanto S/25 del cupo; service = pago del servicio; product = venta retail. is_abono = (kind = deposit).';

-- Backfill: comprobantes de WhatsApp según su verificación (8 filas).
UPDATE public.payments p
SET kind = CASE v.kind WHEN 'deposit' THEN 'deposit' ELSE 'service' END
FROM public.appointment_verifications v
WHERE p.verification_id = v.id AND p.kind IS NULL;

-- Venta retail, sin cita (4 filas).
UPDATE public.payments
SET kind = 'product'
WHERE kind IS NULL AND verification_id IS NULL AND notes ILIKE 'Venta retail%';

-- Resto con cita (224 filas): abono manual o pago de servicio.
UPDATE public.payments
SET kind = CASE WHEN is_abono THEN 'deposit' ELSE 'service' END
WHERE kind IS NULL AND appointment_id IS NOT NULL;

-- Pago final de WhatsApp parcial no es adelanto (afecta 2 filas: S/40 y S/76).
UPDATE public.payments
SET is_abono = false
WHERE kind = 'service' AND is_abono = true AND verification_id IS NOT NULL;
