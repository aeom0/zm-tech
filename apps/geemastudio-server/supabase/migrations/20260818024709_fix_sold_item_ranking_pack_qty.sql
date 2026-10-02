-- Fix get_sold_item_ranking: un pack es 1 unidad comercial (no N líneas de servicio)
-- y las promos multi-ítem son un O (la clienta elige 1), no un AND concatenado.

CREATE OR REPLACE FUNCTION public.get_sold_item_ranking(
  p_tenant_id text,
  p_from date,
  p_to date,
  p_limit int DEFAULT 12
)
RETURNS TABLE (
  kind text,
  item_id text,
  item_name text,
  sold_count bigint,
  revenue numeric
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  WITH bounds AS (
    SELECT
      date_trunc('month', p_from)::date AS start_month,
      date_trunc('month', p_to)::date   AS end_month
  ),
  lines AS (
    SELECT
      a.id AS appointment_id,
      aps.pack_id,
      aps.service_id,
      coalesce(aps.price, 0)::numeric AS line_price
    FROM public.appointment_services aps
    JOIN public.appointments a ON a.id = aps.appointment_id
    CROSS JOIN bounds b
    WHERE a.tenant_id = p_tenant_id
      AND a.status = 'completed'
      AND a.date >= b.start_month
      AND a.date < (b.end_month + interval '1 month')
  ),
  apt_items AS (
    SELECT
      l.appointment_id,
      CASE
        WHEN l.pack_id IS NOT NULL THEN 'pack:' || l.pack_id
        ELSE 'svc:' || l.service_id
      END AS item_key,
      CASE
        WHEN l.pack_id IS NOT NULL THEN
          GREATEST(
            1,
            (
              count(*)::numeric
              / GREATEST(
                  coalesce(jsonb_array_length(pk.service_ids::jsonb), 1),
                  1
                )
            )::int
          )
        ELSE count(*)::int
      END AS qty,
      sum(l.line_price) AS revenue
    FROM lines l
    LEFT JOIN public.packs pk ON pk.id = l.pack_id
    GROUP BY 1, 2, pk.service_ids
  ),
  apt_fp AS (
    SELECT
      ai.appointment_id,
      string_agg(ai.item_key || 'x' || ai.qty::text, '|' ORDER BY ai.item_key) AS fp,
      sum(ai.revenue) AS revenue
    FROM apt_items ai
    GROUP BY ai.appointment_id
  ),
  promo_item_fp AS (
    SELECT
      p.id AS promo_id,
      p.title AS promo_title,
      CASE
        WHEN pi.item_type = 'pack' THEN 'pack:'
        ELSE 'svc:'
      END || pi.item_id || 'x' || pi.quantity::text AS fp
    FROM public.promotion_items pi
    JOIN public.promotions p ON p.id = pi.promotion_id::text
  ),
  promo_bundle_fp AS (
    SELECT
      pif.promo_id,
      pif.promo_title,
      string_agg(pif.fp, '|' ORDER BY pif.fp) AS fp
    FROM promo_item_fp pif
    GROUP BY pif.promo_id, pif.promo_title
    HAVING count(*) > 1
  ),
  promo_fp AS (
    SELECT promo_id, promo_title, fp FROM promo_item_fp
    UNION
    SELECT promo_id, promo_title, fp FROM promo_bundle_fp
  ),
  matched AS (
    SELECT DISTINCT ON (af.appointment_id)
      af.appointment_id,
      pf.promo_id,
      pf.promo_title,
      af.revenue
    FROM apt_fp af
    JOIN promo_fp pf ON pf.fp = af.fp
    ORDER BY af.appointment_id, pf.promo_id
  ),
  promo_rank AS (
    SELECT
      'promo'::text AS kind,
      m.promo_id::text AS item_id,
      m.promo_title AS item_name,
      count(*)::bigint AS sold_count,
      sum(m.revenue)::numeric AS revenue
    FROM matched m
    GROUP BY m.promo_id, m.promo_title
  ),
  pack_rank AS (
    SELECT
      'pack'::text AS kind,
      l.pack_id::text AS item_id,
      coalesce(pk.title, 'Pack') AS item_name,
      count(DISTINCT l.appointment_id)::bigint AS sold_count,
      sum(l.line_price)::numeric AS revenue
    FROM lines l
    LEFT JOIN public.packs pk ON pk.id = l.pack_id
    WHERE l.pack_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM matched m WHERE m.appointment_id = l.appointment_id)
    GROUP BY l.pack_id, pk.title
  ),
  svc_rank AS (
    SELECT
      'service'::text AS kind,
      l.service_id::text AS item_id,
      coalesce(s.name, 'Servicio') AS item_name,
      count(*)::bigint AS sold_count,
      sum(l.line_price)::numeric AS revenue
    FROM lines l
    LEFT JOIN public.services s ON s.id = l.service_id
    WHERE l.pack_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM matched m WHERE m.appointment_id = l.appointment_id)
    GROUP BY l.service_id, s.name
  )
  SELECT r.kind, r.item_id, r.item_name, r.sold_count, r.revenue
  FROM (
    SELECT * FROM promo_rank
    UNION ALL
    SELECT * FROM pack_rank
    UNION ALL
    SELECT * FROM svc_rank
  ) r
  ORDER BY r.revenue DESC, r.sold_count DESC
  LIMIT greatest(1, least(coalesce(p_limit, 12), 40));
END;
$$;

COMMENT ON FUNCTION public.get_sold_item_ranking(text, date, date, int) IS
  'Ranking servicios/packs/promos por ingreso. Pack = 1 unidad (no N líneas). Promo OR = 1 ítem elegido.';
