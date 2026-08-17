-- E2 plan 05 — color de pieza (atributo COLOR en categorías ML que lo exigen)
ALTER TABLE public.repmax_products
  ADD COLUMN IF NOT EXISTS color varchar(80);

COMMENT ON COLUMN public.repmax_products.color IS
  'Color de la pieza cuando la categoría ML exige atributo COLOR (modo manual / export).';
