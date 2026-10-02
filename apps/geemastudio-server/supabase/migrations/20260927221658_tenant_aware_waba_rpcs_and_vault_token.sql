-- Sprint 4 (Plan 04 § Roadmap Sprints, S4-1/S4-2): tenant_id en los 4 RPCs
-- de reenganche/calidad WABA + función Vault para token WhatsApp por tenant
-- (patrón cron_secret, scripts/db/add-cron-secret-to-vault.sql).
--
-- Cambia la firma de las 4 funciones (agrega p_tenant_id) — se DROPean las
-- versiones viejas para no dejar overloads ambiguos. Las Edge Functions que
-- las llaman se actualizan en el mismo PR (batches A/C de S4).
-- Default 'zm-lash-nails' en p_tenant_id preserva el comportamiento actual
-- si algún caller viejo no lo pasa todavía.
--
-- Idempotente — seguro re-ejecutar.

DROP FUNCTION IF EXISTS public.waba_find_silent_phones(int, int);
DROP FUNCTION IF EXISTS public.waba_find_idle_browse_phones(int, int);
DROP FUNCTION IF EXISTS public.waba_find_ads_bounce_phones(int, int);
DROP FUNCTION IF EXISTS public.waba_find_quality_review_candidates(int, int, int, boolean);

CREATE FUNCTION public.waba_find_silent_phones(
  p_tenant_id text DEFAULT 'zm-lash-nails',
  min_minutes int DEFAULT 5,
  max_minutes int DEFAULT 12
)
RETURNS TABLE(
  phone text,
  last_inbound_at timestamptz,
  session_step text,
  watchdog_sent_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT m.phone, m.created_at AS last_inbound_at, s.step, s.watchdog_sent_at
  FROM (
    SELECT DISTINCT ON (phone) phone, direction, created_at
    FROM public.wa_messages
    WHERE tenant_id = p_tenant_id
    ORDER BY phone, created_at DESC
  ) m
  LEFT JOIN public.whatsapp_sessions s
    ON s.phone = m.phone AND s.tenant_id = p_tenant_id
  WHERE m.direction = 'in'
    AND m.created_at < now() - (min_minutes || ' minutes')::interval
    AND m.created_at > now() - (max_minutes || ' minutes')::interval
    AND (s.watchdog_sent_at IS NULL OR s.watchdog_sent_at < m.created_at)
    AND (
      s.browse_reengage_sent_at IS NULL
      OR s.browse_reengage_sent_at < m.created_at
    );
$$;

CREATE FUNCTION public.waba_find_idle_browse_phones(
  p_tenant_id text DEFAULT 'zm-lash-nails',
  min_minutes int DEFAULT 15,
  max_minutes int DEFAULT 60
)
RETURNS TABLE(
  phone text,
  last_out_at timestamptz,
  session_step text,
  browse_reengage_sent_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    m.phone,
    m.created_at AS last_out_at,
    s.step,
    s.browse_reengage_sent_at
  FROM (
    SELECT DISTINCT ON (phone) phone, direction, created_at
    FROM public.wa_messages
    WHERE tenant_id = p_tenant_id
    ORDER BY phone, created_at DESC
  ) m
  INNER JOIN public.whatsapp_sessions s
    ON s.phone = m.phone AND s.tenant_id = p_tenant_id
  CROSS JOIN LATERAL (
    SELECT MAX(mi.created_at) AS last_in_at
    FROM public.wa_messages mi
    WHERE mi.phone = m.phone
      AND mi.tenant_id = p_tenant_id
      AND mi.direction = 'in'
      AND mi.created_at > now() - interval '24 hours'
  ) li
  WHERE m.direction = 'out'
    AND li.last_in_at IS NOT NULL
    AND m.created_at < now() - (min_minutes || ' minutes')::interval
    AND m.created_at > now() - (max_minutes || ' minutes')::interval
    AND (s.step IS NULL OR s.step = 'browsing')
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
    AND (
      s.browse_reengage_sent_at IS NULL
      OR s.browse_reengage_sent_at < li.last_in_at
    )
    AND (
      s.ads_bounce_nudge_sent_at IS NULL
      OR s.ads_bounce_nudge_sent_at < li.last_in_at
    )
    AND (
      s.watchdog_sent_at IS NULL
      OR s.watchdog_sent_at < li.last_in_at
    )
    AND (
      s.from_ad_at IS NULL
      OR s.from_ad_at < li.last_in_at
    );
$$;

CREATE FUNCTION public.waba_find_ads_bounce_phones(
  p_tenant_id text DEFAULT 'zm-lash-nails',
  min_minutes int DEFAULT 15,
  max_minutes int DEFAULT 60
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
  WHERE s.tenant_id = p_tenant_id
    AND s.from_ad_at IS NOT NULL
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
        AND m.tenant_id = p_tenant_id
        AND m.direction = 'in'
        AND m.created_at > s.from_ad_at
    );
$$;

CREATE FUNCTION public.waba_find_quality_review_candidates(
  p_tenant_id text DEFAULT 'zm-lash-nails',
  min_age_minutes int DEFAULT 4,
  max_age_minutes int DEFAULT 30,
  max_rows int DEFAULT 8,
  include_qa boolean DEFAULT false
)
RETURNS TABLE(
  phone text,
  last_activity_at timestamptz,
  session_step text,
  cart_items text,
  quality_review_sent_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH last_msg AS (
    SELECT DISTINCT ON (m.phone)
      m.phone,
      m.created_at AS last_activity_at
    FROM public.wa_messages m
    WHERE m.tenant_id = p_tenant_id
      AND (include_qa OR m.phone !~ '^519990009')
    ORDER BY m.phone, m.created_at DESC
  ),
  recent_counts AS (
    SELECT
      m.phone,
      count(*) FILTER (WHERE m.direction = 'in') AS ins,
      count(*) FILTER (WHERE m.direction = 'out') AS outs
    FROM public.wa_messages m
    WHERE m.tenant_id = p_tenant_id
      AND m.created_at > now() - interval '90 minutes'
      AND (include_qa OR m.phone !~ '^519990009')
    GROUP BY m.phone
  )
  SELECT
    lm.phone,
    lm.last_activity_at,
    s.step,
    s.cart_items,
    s.quality_review_sent_at
  FROM last_msg lm
  INNER JOIN recent_counts rc ON rc.phone = lm.phone
  LEFT JOIN public.whatsapp_sessions s
    ON s.phone = lm.phone AND s.tenant_id = p_tenant_id
  WHERE lm.last_activity_at < now() - (min_age_minutes || ' minutes')::interval
    AND lm.last_activity_at > now() - (max_age_minutes || ' minutes')::interval
    AND rc.ins >= 1
    AND rc.outs >= 1
    AND (
      s.quality_review_sent_at IS NULL
      OR s.quality_review_sent_at < lm.last_activity_at
    )
  ORDER BY lm.last_activity_at DESC
  LIMIT GREATEST(1, LEAST(max_rows, 20));
$$;

-- Solo cron/service_role invoca estas 4 — no exponer a anon/authenticated
-- (waba_find_ads_bounce_phones/idle_browse/silent_phones venían con GRANT ALL
-- a anon/authenticated heredado del baseline; se cierra al recrearlas).
REVOKE ALL ON FUNCTION public.waba_find_silent_phones(text, int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.waba_find_idle_browse_phones(text, int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.waba_find_ads_bounce_phones(text, int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.waba_find_quality_review_candidates(text, int, int, int, boolean) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.waba_find_silent_phones(text, int, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.waba_find_idle_browse_phones(text, int, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.waba_find_ads_bounce_phones(text, int, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.waba_find_quality_review_candidates(text, int, int, int, boolean) TO service_role;

-- Vault: token WhatsApp Cloud API por tenant, nombre `waba_token_<tenant_id>`
-- (mismo patrón que cron_secret). El secret se siembra a mano, fuera de esta
-- migración (ver docs/plans/geema-migration/04-ROADMAP-SPRINTS.md § S4-1).
CREATE OR REPLACE FUNCTION public.get_tenant_waba_token(p_tenant_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'waba_token_' || p_tenant_id;

  RETURN v_secret;
END;
$$;

COMMENT ON FUNCTION public.get_tenant_waba_token(text) IS
  'Lee el token WhatsApp Cloud API del tenant desde Vault (secret waba_token_<tenant_id>). Solo service_role.';

REVOKE ALL ON FUNCTION public.get_tenant_waba_token(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_tenant_waba_token(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_waba_token(text) TO service_role;

