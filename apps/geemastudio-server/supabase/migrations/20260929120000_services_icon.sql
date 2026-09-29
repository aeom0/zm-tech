-- Ícono propio por servicio (clave de @zmtech/icons). NULL = hereda el de la categoría.
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS icon text;
