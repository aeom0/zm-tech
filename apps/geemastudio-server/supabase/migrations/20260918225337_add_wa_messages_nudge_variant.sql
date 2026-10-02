ALTER TABLE public.wa_messages
  ADD COLUMN IF NOT EXISTS nudge_variant text;

COMMENT ON COLUMN public.wa_messages.nudge_variant IS
  'Variante de copy para mensajes source=nudge (cart-nudge): ''emotional'' | ''generic''. NULL para mensajes que no son nudge o son de antes de esta columna. Sirve para medir % carrito -> fecha elegida de venta emocional CTWA v1 (docs/waba/prompts/WABA_HAIKU_DIRECTRICES.md § Venta emocional CTWA).';
