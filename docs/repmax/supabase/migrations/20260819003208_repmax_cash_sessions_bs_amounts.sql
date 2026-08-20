-- Montos de apertura y cierre en bolívares para cuadrar caja por moneda.
-- Alcance: SOLO public.repmax_cash_sessions.

ALTER TABLE public.repmax_cash_sessions
  ADD COLUMN IF NOT EXISTS opening_amount_bs DECIMAL(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS closing_amount_bs DECIMAL(14, 2);
