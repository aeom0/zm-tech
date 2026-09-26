-- Recargo POS/tarjeta configurable por tenant (comisión del POS; no cuenta como ingreso).
ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS pos_fee_percent numeric(5,2) NOT NULL DEFAULT 5
  CHECK (pos_fee_percent >= 0 AND pos_fee_percent <= 100);
