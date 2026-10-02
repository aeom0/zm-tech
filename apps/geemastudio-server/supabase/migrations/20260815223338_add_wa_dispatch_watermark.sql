-- Watermark de "hasta qué inbound se despachó" por teléfono, para reemplazar
-- la heurística rota de shouldSkipDispatchPeerAlreadyHandled (comparaba
-- "último OUT del teléfono" vs "último IN", sin correlacionar cuál inbound
-- generó ese OUT — falso positivo cuando dos turnos de texto llegan cerca
-- (~9s) y el primero dispara un flujo lento con OUT tardío que "tapa" al
-- segundo inbound, ya despachado o no). Caso: Milagros Iparraguirre
-- 51920083645 (15-ago-2026) — pregunta de ubicación nunca respondida.

CREATE OR REPLACE FUNCTION public.waba_mark_dispatch_watermark(
  p_phone text,
  p_upto timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_phone IS NULL OR length(trim(p_phone)) = 0 OR p_upto IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.wa_action_debounce AS d (phone, kind, claimed_at)
  VALUES (trim(p_phone), 'dispatch_watermark', p_upto)
  ON CONFLICT (phone, kind) DO UPDATE
    SET claimed_at = GREATEST(d.claimed_at, EXCLUDED.claimed_at);
END;
$$;

REVOKE ALL ON FUNCTION public.waba_mark_dispatch_watermark(text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.waba_mark_dispatch_watermark(text, timestamptz) TO service_role;

