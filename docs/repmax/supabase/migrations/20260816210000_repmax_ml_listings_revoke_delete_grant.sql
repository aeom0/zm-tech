-- Alinear GRANT con RLS: no hay policy DELETE en repmax_ml_listings.
-- La migración original otorgó DELETE sin policy (RLS bloquea, pero el GRANT sobraba).
-- Proyecto: llacowjutjfefboqgfnj

REVOKE DELETE ON public.repmax_ml_listings FROM authenticated;

COMMENT ON TABLE public.repmax_ml_listings IS
  'Publicación MercadoLibre por producto (1:1 opcional). DELETE vía CASCADE al borrar producto; sin policy DELETE para authenticated.';
