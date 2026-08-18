-- Catálogo de marca/modelo/años agregado a mano por cada tienda.
-- Complementa el seed estático en apps/repmax-mobile/src/constants/brands.ts:
-- lo que la tienda agrega acá aparece en el picker de "Vehículo compatible"
-- del formulario de producto, para esa tienda, sin tocar el seed global.
-- Alcance: SOLO public.repmax_vehicle_catalog (no tocar odental_*, hub_*, contacts, quote_leads).
-- Proyecto: llacowjutjfefboqgfnj
-- Confirmado por Alberto (chat 2026-08-18): catálogo persistente por tienda.

CREATE TABLE IF NOT EXISTS public.repmax_vehicle_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.repmax_stores(id) ON DELETE CASCADE,

  brand varchar(100) NOT NULL,
  model varchar(100) NOT NULL,
  year_from integer,
  year_to integer,
  vehicle_type repmax_vehicle_type,

  created_by uuid REFERENCES public.repmax_store_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uniq_repmax_vehicle_catalog UNIQUE (store_id, brand, model, year_from, year_to)
);

COMMENT ON TABLE public.repmax_vehicle_catalog IS
  'Marca/modelo/años que cada tienda agrega a mano para reutilizar en el picker de Vehículo compatible. No reemplaza el seed estático del app, lo complementa por tienda.';

CREATE INDEX IF NOT EXISTS idx_repmax_vehicle_catalog_store
  ON public.repmax_vehicle_catalog (store_id, brand);

ALTER TABLE public.repmax_vehicle_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "repmax_vehicle_catalog_select_members"
  ON public.repmax_vehicle_catalog FOR SELECT
  TO authenticated
  USING (store_id = ANY (public.repmax_user_store_ids()));

CREATE POLICY "repmax_vehicle_catalog_insert_members"
  ON public.repmax_vehicle_catalog FOR INSERT
  TO authenticated
  WITH CHECK (store_id = ANY (public.repmax_user_store_ids()));

-- DELETE: solo el owner (limpiar entradas mal tipeadas).
CREATE POLICY "repmax_vehicle_catalog_delete_owner"
  ON public.repmax_vehicle_catalog FOR DELETE
  TO authenticated
  USING (public.repmax_user_role_in_store(store_id) = 'owner');

GRANT SELECT, INSERT, DELETE ON public.repmax_vehicle_catalog TO authenticated;
REVOKE ALL ON public.repmax_vehicle_catalog FROM anon;
