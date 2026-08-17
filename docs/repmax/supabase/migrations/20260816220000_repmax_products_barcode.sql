-- Código de barras / QR por producto (lookup POS e inventario)
ALTER TABLE public.repmax_products
  ADD COLUMN IF NOT EXISTS barcode varchar(255);

COMMENT ON COLUMN public.repmax_products.barcode IS
  'Payload de código de barras o QR (EAN, UPC, Code128, QR). Único por tienda; NULL si no tiene.';

CREATE UNIQUE INDEX IF NOT EXISTS uniq_repmax_products_store_barcode
  ON public.repmax_products (store_id, barcode)
  WHERE barcode IS NOT NULL AND length(btrim(barcode)) > 0;
