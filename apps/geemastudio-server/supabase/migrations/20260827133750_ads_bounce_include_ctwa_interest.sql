-- ads-bounce: incluir step awaiting_ctwa_interest (CTWA lista de interés).
-- Antes solo browsing/null → leads pegados en la lista nunca recibían el nudge.
CREATE OR REPLACE FUNCTION public.waba_find_ads_bounce_phones(
  min_minutes int,
  max_minutes int
)
RETURNS TABLE(
  phone text,
  from_ad_at timestamptz,
  session_step text,
  ads_bounce_nudge_sent_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    s.phone,
    s.from_ad_at,
    s.step,
    s.ads_bounce_nudge_sent_at
  FROM public.whatsapp_sessions s
  WHERE s.from_ad_at IS NOT NULL
    AND s.from_ad_at < now() - (min_minutes || ' minutes')::interval
    AND s.from_ad_at > now() - (max_minutes || ' minutes')::interval
    AND (
      s.ads_bounce_nudge_sent_at IS NULL
      OR s.ads_bounce_nudge_sent_at < s.from_ad_at
    )
    AND (
      s.browse_reengage_sent_at IS NULL
      OR s.browse_reengage_sent_at < s.from_ad_at
    )
    AND (
      s.watchdog_sent_at IS NULL
      OR s.watchdog_sent_at < s.from_ad_at
    )
    AND (
      s.step IS NULL
      OR s.step IN ('browsing', 'awaiting_ctwa_interest')
    )
    AND (
      s.cart_items IS NULL
      OR btrim(s.cart_items) = ''
      OR s.cart_items = '[]'
      OR s.cart_items::jsonb = '[]'::jsonb
    )
    AND (
      s.cart_service_ids IS NULL
      OR btrim(s.cart_service_ids) = ''
      OR s.cart_service_ids = '[]'
      OR s.cart_service_ids::jsonb = '[]'::jsonb
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.wa_messages m
      WHERE m.phone = s.phone
        AND m.direction = 'in'
        AND m.created_at > s.from_ad_at
    );
$$;

