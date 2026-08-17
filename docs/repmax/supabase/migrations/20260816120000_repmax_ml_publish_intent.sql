-- E1 plan 05: intención de export ML en producto + estados manual en listings.
-- Alcance: SOLO repmax_products.ml_publish_intent y CHECK de repmax_ml_listings.status.
-- Proyecto: llacowjutjfefboqgfnj

ALTER TABLE public.repmax_products
  ADD COLUMN IF NOT EXISTS ml_publish_intent boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.repmax_products.ml_publish_intent IS
  'El vendedor quiere incluir este producto en export/catálogo ML (modo puente sin OAuth).';

-- Ampliar ciclo de vida manual (exported, published_manual, needs_update).
ALTER TABLE public.repmax_ml_listings
  DROP CONSTRAINT IF EXISTS repmax_ml_listings_status_check;

ALTER TABLE public.repmax_ml_listings
  ADD CONSTRAINT repmax_ml_listings_status_check
  CHECK (
    status IN (
      'draft',
      'ready',
      'exported',
      'published_manual',
      'needs_update',
      'published',
      'paused',
      'error'
    )
  );
