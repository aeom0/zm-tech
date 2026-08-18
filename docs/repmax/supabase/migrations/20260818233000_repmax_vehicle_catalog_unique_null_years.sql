-- Evita duplicados en repmax_vehicle_catalog cuando uno o ambos años son NULL.
-- PostgreSQL no considera NULL = NULL dentro de un UNIQUE convencional.
-- Alcance: SOLO public.repmax_vehicle_catalog.

CREATE UNIQUE INDEX IF NOT EXISTS uniq_repmax_vehicle_catalog_years_normalized
  ON public.repmax_vehicle_catalog (
    store_id,
    brand,
    model,
    (COALESCE(year_from, -1)),
    (COALESCE(year_to, -1))
  );
