-- Gating real de planes de suscripción (plan 09-PLAN-planes-gating.md).
-- Tabla de límites/features por plan + helpers reusables para RLS/Edge Functions.
-- Alcance: SOLO public.repmax_plan_limits + trigger en repmax_products
-- (no tocar odental_*, hub_*, contacts, quote_leads).
-- Proyecto: llacowjutjfefboqgfnj

CREATE TABLE IF NOT EXISTS public.repmax_plan_limits (
  plan public.repmax_subscription_plan PRIMARY KEY,
  max_products integer,           -- NULL = ilimitado
  max_store_users integer,        -- NULL = ilimitado
  ml_catalog_export boolean NOT NULL DEFAULT false,
  custom_domain boolean NOT NULL DEFAULT false,
  advanced_reports boolean NOT NULL DEFAULT false
);

COMMENT ON TABLE public.repmax_plan_limits IS
  'Matriz de límites/features por plan de suscripción. Fuente de verdad para repmax_plan_allows() y repmax_plan_limit(). Escritura solo service_role.';

INSERT INTO public.repmax_plan_limits (plan, max_products, max_store_users, ml_catalog_export, custom_domain, advanced_reports)
VALUES
  ('basic', 300, 2, false, false, false),
  ('pro', NULL, 5, true, true, true),
  ('enterprise', NULL, NULL, true, true, true)
ON CONFLICT (plan) DO UPDATE SET
  max_products = EXCLUDED.max_products,
  max_store_users = EXCLUDED.max_store_users,
  ml_catalog_export = EXCLUDED.ml_catalog_export,
  custom_domain = EXCLUDED.custom_domain,
  advanced_reports = EXCLUDED.advanced_reports;

ALTER TABLE public.repmax_plan_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "repmax_plan_limits_select"
  ON public.repmax_plan_limits FOR SELECT
  TO authenticated
  USING (true);

GRANT SELECT ON public.repmax_plan_limits TO authenticated;
REVOKE ALL ON public.repmax_plan_limits FROM anon;

-- ============================================================
-- Helpers reusables (reemplazan checks hardcodeados tipo el de ML)
-- ============================================================

CREATE OR REPLACE FUNCTION public.repmax_plan_allows(p_store_id uuid, p_feature text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE p_feature
    WHEN 'ml_catalog_export' THEN COALESCE(l.ml_catalog_export, false)
    WHEN 'custom_domain' THEN COALESCE(l.custom_domain, false)
    WHEN 'advanced_reports' THEN COALESCE(l.advanced_reports, false)
    ELSE false
  END
  FROM public.repmax_stores s
  LEFT JOIN public.repmax_plan_limits l ON l.plan = s.plan
  WHERE s.id = p_store_id;
$$;

REVOKE ALL ON FUNCTION public.repmax_plan_allows(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.repmax_plan_allows(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.repmax_plan_limit(p_store_id uuid, p_limit_name text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE p_limit_name
    WHEN 'max_products' THEN l.max_products
    WHEN 'max_store_users' THEN l.max_store_users
    ELSE NULL
  END
  FROM public.repmax_stores s
  LEFT JOIN public.repmax_plan_limits l ON l.plan = s.plan
  WHERE s.id = p_store_id;
$$;

REVOKE ALL ON FUNCTION public.repmax_plan_limit(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.repmax_plan_limit(uuid, text) TO authenticated;

-- ============================================================
-- Enforcement: límite duro de max_products por tienda
-- ============================================================

CREATE OR REPLACE FUNCTION public.repmax_enforce_product_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer;
  v_count integer;
BEGIN
  v_limit := public.repmax_plan_limit(NEW.store_id, 'max_products');

  IF v_limit IS NOT NULL THEN
    SELECT count(*) INTO v_count
    FROM public.repmax_products
    WHERE store_id = NEW.store_id;

    IF v_count >= v_limit THEN
      RAISE EXCEPTION 'Límite de % productos alcanzado para el plan actual. Actualiza tu plan para agregar más.', v_limit
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_repmax_enforce_product_limit
  BEFORE INSERT ON public.repmax_products
  FOR EACH ROW EXECUTE FUNCTION public.repmax_enforce_product_limit();
