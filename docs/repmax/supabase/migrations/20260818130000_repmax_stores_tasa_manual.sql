-- Permite a cada tienda seguir fijando la tasa USD/Bs a mano (comportamiento
-- legacy) en vez de usar la tasa BCV en vivo de hub_tasas_bcv/hub_tasas_usdt.
-- APLICADA en producción 2026-08-18.

ALTER TABLE public.repmax_stores
  ADD COLUMN IF NOT EXISTS usar_tasa_manual boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.repmax_stores.usar_tasa_manual IS
  'Si true, el checkout usa repmax_stores.usd_bs_rate fijado a mano en vez de la tasa BCV en vivo.';
