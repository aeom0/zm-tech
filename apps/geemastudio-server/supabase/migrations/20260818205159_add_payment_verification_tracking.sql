ALTER TABLE public.appointment_verifications
  ADD COLUMN IF NOT EXISTS payment_method text;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS verification_id uuid
  REFERENCES public.appointment_verifications(id);

CREATE INDEX IF NOT EXISTS idx_payments_verification_id
  ON public.payments(verification_id);
