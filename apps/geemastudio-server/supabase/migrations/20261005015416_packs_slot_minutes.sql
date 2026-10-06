-- Minutos que el pack ocupa en agenda (turnover incluido). NULL = suma de
-- servicios + turnover, como hasta ahora. Vanessa (4-oct-2026): lifting con
-- laminado/planchado 50 min; 2 lifting simultáneos 75 min.

ALTER TABLE public.packs ADD COLUMN IF NOT EXISTS slot_minutes integer;
ALTER TABLE public.packs DROP CONSTRAINT IF EXISTS packs_slot_minutes_positive;
ALTER TABLE public.packs ADD CONSTRAINT packs_slot_minutes_positive
  CHECK (slot_minutes IS NULL OR slot_minutes > 0);

UPDATE public.packs SET slot_minutes = 75
 WHERE id = 'a56e526e-5620-42bc-83b0-9d09eea603af'; -- 2 Lifting de Pestañas
UPDATE public.packs SET slot_minutes = 50
 WHERE id IN (
   'e6b23e33-2381-46b7-a8f4-de926f2a7193', -- Lifting + Laminado Cejas
   '8c1af9b7-ad8d-4051-b4d9-5a22c53dc342'  -- Lifting + Planchado
 );
