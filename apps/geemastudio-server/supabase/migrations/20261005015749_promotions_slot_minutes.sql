-- Duración de agenda configurable por promo (min, incluye turnover). NULL = suma de duraciones de sus servicios.
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS slot_minutes integer;
ALTER TABLE public.promotions DROP CONSTRAINT IF EXISTS promotions_slot_minutes_positive;
ALTER TABLE public.promotions ADD CONSTRAINT promotions_slot_minutes_positive CHECK (slot_minutes IS NULL OR slot_minutes > 0);
