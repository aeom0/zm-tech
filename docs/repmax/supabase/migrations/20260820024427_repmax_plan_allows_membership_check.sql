-- Endurece repmax_plan_allows/repmax_plan_limit: un usuario authenticated
-- solo puede consultar los flags de plan de tiendas a las que pertenece
-- (antes cualquier authenticated podía pasar cualquier store_id). Mismo
-- patrón que repmax_user_role_in_store.
--
-- auth.uid() IS NULL identifica llamadas server-side (Edge Functions con
-- adminClient()/service_role, ej. ml-oauth-start) — esas ya verifican
-- membresía en código de aplicación (requireStoreMember) antes de llamar
-- a esta función, así que no se les aplica el filtro (service_role bypasea
-- RLS igual, restringirlo ahí no suma seguridad y sí rompe el flujo).
-- Alcance: SOLO estas 2 funciones.
-- Proyecto: llacowjutjfefboqgfnj

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
  WHERE s.id = p_store_id
    AND (auth.uid() IS NULL OR s.id = ANY (public.repmax_user_store_ids()));
$$;

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
  WHERE s.id = p_store_id
    AND (auth.uid() IS NULL OR s.id = ANY (public.repmax_user_store_ids()));
$$;
