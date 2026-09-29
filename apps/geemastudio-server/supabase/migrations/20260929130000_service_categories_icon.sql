-- Ícono por categoría (clave de @zmtech/icons). NULL = ícono por defecto del rubro.
ALTER TABLE public.service_categories
  ADD COLUMN IF NOT EXISTS icon text;
