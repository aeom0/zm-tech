-- Analítica del panel web /finanzas (GROUP BY en Postgres, evita tope 1000 PostgREST).
CREATE OR REPLACE FUNCTION public.get_monthly_client_growth(
  p_tenant_id text,
  p_from date,
  p_to date
)
RETURNS TABLE (
  month_start date,
  nuevas bigint,
  recurrentes bigint,
  citas bigint
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
  months AS (
    SELECT date_trunc('month', gs)::date AS month
    FROM bounds b
    CROSS JOIN generate_series(
      b.start_month::timestamp,
      b.end_month::timestamp,
      interval '1 month'
    ) gs
  ),
  first_visit AS (
    SELECT
      a.client_id,
      date_trunc('month', min(a.date))::date AS first_month
    FROM public.appointments a
    WHERE a.tenant_id = p_tenant_id
      AND a.status = 'completed'
      AND a.client_id IS NOT NULL
    GROUP BY a.client_id
  ),
  completed AS (
    SELECT
      a.id,
      a.client_id,
      date_trunc('month', a.date)::date AS month
    FROM public.appointments a, bounds b
    WHERE a.tenant_id = p_tenant_id
      AND a.status = 'completed'
      AND a.date >= b.start_month
      AND a.date < (b.end_month + interval '1 month')
  )
  SELECT
    m.month,
    count(DISTINCT c.client_id) FILTER (
      WHERE c.client_id IS NOT NULL AND fv.first_month = m.month
    )::bigint,
    count(DISTINCT c.client_id) FILTER (
      WHERE c.client_id IS NOT NULL AND fv.first_month IS DISTINCT FROM m.month
    )::bigint,
    count(c.id)::bigint
  FROM months m
  LEFT JOIN completed c ON c.month = m.month
  LEFT JOIN first_visit fv ON fv.client_id = c.client_id
  GROUP BY m.month
  ORDER BY 1;
END;
$$;

COMMENT ON FUNCTION public.get_monthly_client_growth(text, date, date) IS
  'Clientas nuevas vs recurrentes y citas completed por mes. Admin only.';

REVOKE ALL ON FUNCTION public.get_monthly_client_growth(text, date, date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_monthly_client_growth(text, date, date) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_monthly_client_growth(text, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_client_growth(text, date, date) TO service_role;

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
      count(*)::int AS qty,
      sum(l.line_price) AS revenue
    FROM lines l
    GROUP BY 1, 2
  ),
  apt_fp AS (
    SELECT
      ai.appointment_id,
      string_agg(ai.item_key || 'x' || ai.qty::text, '|' ORDER BY ai.item_key) AS fp,
      sum(ai.revenue) AS revenue
    FROM apt_items ai
    GROUP BY ai.appointment_id
  ),
  promo_fp AS (
    SELECT
      p.id AS promo_id,
      p.title AS promo_title,
      string_agg(
        CASE
          WHEN pi.item_type = 'pack' THEN 'pack:'
          ELSE 'svc:'
        END || pi.item_id || 'x' || pi.quantity::text,
        '|'
        ORDER BY
          CASE
            WHEN pi.item_type = 'pack' THEN 'pack:'
            ELSE 'svc:'
          END || pi.item_id
      ) AS fp
    FROM public.promotion_items pi
    JOIN public.promotions p ON p.id = pi.promotion_id::text
    GROUP BY p.id, p.title
  ),
  matched AS (
    SELECT af.appointment_id, pf.promo_id, pf.promo_title, af.revenue
    FROM apt_fp af
    JOIN promo_fp pf ON pf.fp = af.fp
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
  'Ranking servicios/packs/promos por ingreso en citas completed. Admin only. Promo = huella de ítems.';

REVOKE ALL ON FUNCTION public.get_sold_item_ranking(text, date, date, int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_sold_item_ranking(text, date, date, int) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_sold_item_ranking(text, date, date, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sold_item_ranking(text, date, date, int) TO service_role;

