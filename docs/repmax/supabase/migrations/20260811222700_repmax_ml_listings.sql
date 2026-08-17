-- Ciclo de vida de publicaciones MercadoLibre (fase 1: contrato + RLS).
-- Relación 1:1 opcional con repmax_products (un producto → 0 o 1 listing).
-- Alcance: SOLO public.repmax_ml_listings (no tocar odental_*, hub_*, contacts, quote_leads).
-- Proyecto: llacowjutjfefboqgfnj
-- NO aplicar sin confirmación explícita de Alberto (MCP apply_migration / SQL Editor).

CREATE TABLE IF NOT EXISTS public.repmax_ml_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.repmax_products(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.repmax_stores(id) ON DELETE CASCADE,

  -- Resultado de la predicción de categoría
  ml_domain_id text,
  ml_category_id text,
  ml_category_name text,
  ml_attributes_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  prediction_confidence smallint, -- rank 1/2/3 elegido por el vendedor

  -- Ciclo de vida
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'ready', 'published', 'paused', 'error')),
  ml_item_id text, -- se llena en fase 2 cuando se publique de verdad
  last_error text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uniq_repmax_ml_listings_product UNIQUE (product_id)
);

CREATE INDEX IF NOT EXISTS idx_repmax_ml_listings_store
  ON public.repmax_ml_listings (store_id);

COMMENT ON TABLE public.repmax_ml_listings IS
  'Publicación MercadoLibre por producto (1:1 opcional). Predicción de categoría en fase 1; ml_item_id en fase 2.';

-- updated_at (mismo trigger prefijado que stores/products)
CREATE TRIGGER trg_repmax_ml_listings_updated_at
  BEFORE UPDATE ON public.repmax_ml_listings
  FOR EACH ROW EXECUTE FUNCTION public.repmax_set_updated_at();

ALTER TABLE public.repmax_ml_listings ENABLE ROW LEVEL SECURITY;

-- RLS: columnas calificadas (evita ambigüedad tipo su.store_id = su.store_id).
-- Helper existente: public.repmax_user_store_ids().
CREATE POLICY "repmax_ml_listings_select"
  ON public.repmax_ml_listings FOR SELECT
  TO authenticated
  USING (
    public.repmax_ml_listings.store_id = ANY (public.repmax_user_store_ids())
  );

CREATE POLICY "repmax_ml_listings_insert"
  ON public.repmax_ml_listings FOR INSERT
  TO authenticated
  WITH CHECK (
    public.repmax_ml_listings.store_id = ANY (public.repmax_user_store_ids())
  );

CREATE POLICY "repmax_ml_listings_update"
  ON public.repmax_ml_listings FOR UPDATE
  TO authenticated
  USING (
    public.repmax_ml_listings.store_id = ANY (public.repmax_user_store_ids())
  )
  WITH CHECK (
    public.repmax_ml_listings.store_id = ANY (public.repmax_user_store_ids())
  );

-- Remoto ZMTech no auto-expone tablas nuevas.
-- Sin DELETE policy todavía — no otorgar DELETE a authenticated (evita hueco si se agrega policy después).
GRANT SELECT, INSERT, UPDATE ON public.repmax_ml_listings TO authenticated;
REVOKE ALL ON public.repmax_ml_listings FROM anon;
