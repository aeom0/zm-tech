-- Hardening security + performance RepMAX (Supabase Advisors)
-- Alcance: SOLO objetos repmax_* (no tocar odental_*, hub_*, contacts, quote_leads)
-- Proyecto: llacowjutjfefboqgfnj

-- =========================================================
-- 1. SECURITY: fijar search_path en trigger updated_at
-- =========================================================
ALTER FUNCTION public.repmax_set_updated_at() SET search_path = public;

-- =========================================================
-- 2. SECURITY: revocar EXECUTE a anon (menor privilegio)
--    La lógica interna ya valida auth.uid(); esto cierra superficie.
--    Storefront público usa políticas directas (is_active), no estos helpers.
-- =========================================================
REVOKE EXECUTE ON FUNCTION public.repmax_create_sale_with_items(
  uuid, uuid, uuid, uuid, public.repmax_payment_method, jsonb, numeric, text, jsonb
) FROM anon;

REVOKE EXECUTE ON FUNCTION public.repmax_user_role_in_store(uuid) FROM anon;

REVOKE EXECUTE ON FUNCTION public.repmax_user_store_ids() FROM anon;

-- =========================================================
-- 3. PERFORMANCE: auth.uid() → (select auth.uid()) (initplan)
--    Lógica tomada de 20260801140000_repmax_rls_and_storage.sql
--    + calificación explícita en NOT EXISTS (evita su.store_id = su.store_id)
-- =========================================================

DROP POLICY IF EXISTS "repmax_stores_insert_authenticated" ON public.repmax_stores;
CREATE POLICY "repmax_stores_insert_authenticated"
  ON public.repmax_stores FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "repmax_store_users_select_members" ON public.repmax_store_users;
CREATE POLICY "repmax_store_users_select_members"
  ON public.repmax_store_users FOR SELECT
  TO authenticated
  USING (
    store_id = ANY (public.repmax_user_store_ids())
    OR user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "repmax_store_users_insert" ON public.repmax_store_users;
CREATE POLICY "repmax_store_users_insert"
  ON public.repmax_store_users FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      user_id = (SELECT auth.uid())
      AND role = 'owner'
      AND NOT EXISTS (
        SELECT 1 FROM public.repmax_store_users su
        WHERE su.store_id = repmax_store_users.store_id
      )
    )
    OR public.repmax_user_role_in_store(store_id) = 'owner'
  );

-- =========================================================
-- 4. PERFORMANCE: índices en FKs sin cobertura
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_repmax_cash_sessions_cashier
  ON public.repmax_cash_sessions (cashier_id);

CREATE INDEX IF NOT EXISTS idx_repmax_sale_items_product
  ON public.repmax_sale_items (product_id);

CREATE INDEX IF NOT EXISTS idx_repmax_sales_cashier
  ON public.repmax_sales (cashier_id);

CREATE INDEX IF NOT EXISTS idx_repmax_sales_customer
  ON public.repmax_sales (customer_id);
