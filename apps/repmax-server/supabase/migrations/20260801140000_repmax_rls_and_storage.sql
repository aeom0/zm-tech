-- RLS + helpers + storefront público + storage bucket repmax-products
-- NUNCA tocar contacts, quote_leads ni odental_*.

-- ============================================================
-- Helpers (SECURITY DEFINER + search_path fijo — evita recursión RLS)
-- ============================================================
CREATE OR REPLACE FUNCTION public.repmax_user_store_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    ARRAY(
      SELECT store_id
      FROM public.repmax_store_users
      WHERE user_id = auth.uid()
        AND is_active = true
    ),
    ARRAY[]::UUID[]
  );
$$;

CREATE OR REPLACE FUNCTION public.repmax_user_role_in_store(p_store_id UUID)
RETURNS public.repmax_store_user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.repmax_store_users
  WHERE user_id = auth.uid()
    AND store_id = p_store_id
    AND is_active = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.repmax_user_store_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.repmax_user_role_in_store(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.repmax_user_store_ids() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.repmax_user_role_in_store(UUID) TO authenticated, anon;

-- ============================================================
-- RLS enable
-- ============================================================
ALTER TABLE public.repmax_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repmax_store_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repmax_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repmax_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repmax_cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repmax_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repmax_sale_items ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STORES
-- ============================================================
CREATE POLICY "repmax_stores_select_members"
  ON public.repmax_stores FOR SELECT
  TO authenticated
  USING (id = ANY (public.repmax_user_store_ids()));

-- Storefront público: catálogo activo sin sesión
CREATE POLICY "repmax_stores_select_public_active"
  ON public.repmax_stores FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "repmax_stores_insert_authenticated"
  ON public.repmax_stores FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "repmax_stores_update_owner"
  ON public.repmax_stores FOR UPDATE
  TO authenticated
  USING (public.repmax_user_role_in_store(id) = 'owner')
  WITH CHECK (public.repmax_user_role_in_store(id) = 'owner');

-- ============================================================
-- STORE_USERS
-- ============================================================
CREATE POLICY "repmax_store_users_select_members"
  ON public.repmax_store_users FOR SELECT
  TO authenticated
  USING (
    store_id = ANY (public.repmax_user_store_ids())
    OR user_id = auth.uid()
  );

-- Bootstrap: el dueño se auto-asigna, o un owner existente invita
CREATE POLICY "repmax_store_users_insert"
  ON public.repmax_store_users FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      user_id = auth.uid()
      AND role = 'owner'
      AND NOT EXISTS (
        SELECT 1 FROM public.repmax_store_users su
        WHERE su.store_id = store_id
      )
    )
    OR public.repmax_user_role_in_store(store_id) = 'owner'
  );

CREATE POLICY "repmax_store_users_update_owner"
  ON public.repmax_store_users FOR UPDATE
  TO authenticated
  USING (public.repmax_user_role_in_store(store_id) = 'owner')
  WITH CHECK (public.repmax_user_role_in_store(store_id) = 'owner');

CREATE POLICY "repmax_store_users_delete_owner"
  ON public.repmax_store_users FOR DELETE
  TO authenticated
  USING (public.repmax_user_role_in_store(store_id) = 'owner');

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE POLICY "repmax_products_select_members"
  ON public.repmax_products FOR SELECT
  TO authenticated
  USING (store_id = ANY (public.repmax_user_store_ids()));

CREATE POLICY "repmax_products_select_public_active"
  ON public.repmax_products FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "repmax_products_insert_members"
  ON public.repmax_products FOR INSERT
  TO authenticated
  WITH CHECK (store_id = ANY (public.repmax_user_store_ids()));

CREATE POLICY "repmax_products_update_members"
  ON public.repmax_products FOR UPDATE
  TO authenticated
  USING (store_id = ANY (public.repmax_user_store_ids()))
  WITH CHECK (store_id = ANY (public.repmax_user_store_ids()));

CREATE POLICY "repmax_products_delete_members"
  ON public.repmax_products FOR DELETE
  TO authenticated
  USING (store_id = ANY (public.repmax_user_store_ids()));

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE POLICY "repmax_customers_select_members"
  ON public.repmax_customers FOR SELECT
  TO authenticated
  USING (store_id = ANY (public.repmax_user_store_ids()));

CREATE POLICY "repmax_customers_insert_members"
  ON public.repmax_customers FOR INSERT
  TO authenticated
  WITH CHECK (store_id = ANY (public.repmax_user_store_ids()));

CREATE POLICY "repmax_customers_update_members"
  ON public.repmax_customers FOR UPDATE
  TO authenticated
  USING (store_id = ANY (public.repmax_user_store_ids()))
  WITH CHECK (store_id = ANY (public.repmax_user_store_ids()));

CREATE POLICY "repmax_customers_delete_members"
  ON public.repmax_customers FOR DELETE
  TO authenticated
  USING (store_id = ANY (public.repmax_user_store_ids()));

-- ============================================================
-- CASH_SESSIONS
-- ============================================================
CREATE POLICY "repmax_cash_sessions_select_members"
  ON public.repmax_cash_sessions FOR SELECT
  TO authenticated
  USING (store_id = ANY (public.repmax_user_store_ids()));

CREATE POLICY "repmax_cash_sessions_insert_members"
  ON public.repmax_cash_sessions FOR INSERT
  TO authenticated
  WITH CHECK (store_id = ANY (public.repmax_user_store_ids()));

CREATE POLICY "repmax_cash_sessions_update_members"
  ON public.repmax_cash_sessions FOR UPDATE
  TO authenticated
  USING (store_id = ANY (public.repmax_user_store_ids()))
  WITH CHECK (store_id = ANY (public.repmax_user_store_ids()));

-- ============================================================
-- SALES
-- ============================================================
CREATE POLICY "repmax_sales_select_members"
  ON public.repmax_sales FOR SELECT
  TO authenticated
  USING (store_id = ANY (public.repmax_user_store_ids()));

CREATE POLICY "repmax_sales_insert_members"
  ON public.repmax_sales FOR INSERT
  TO authenticated
  WITH CHECK (store_id = ANY (public.repmax_user_store_ids()));

CREATE POLICY "repmax_sales_update_members"
  ON public.repmax_sales FOR UPDATE
  TO authenticated
  USING (store_id = ANY (public.repmax_user_store_ids()))
  WITH CHECK (store_id = ANY (public.repmax_user_store_ids()));

-- ============================================================
-- SALE_ITEMS
-- ============================================================
CREATE POLICY "repmax_sale_items_select_members"
  ON public.repmax_sale_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.repmax_sales s
      WHERE s.id = sale_id
        AND s.store_id = ANY (public.repmax_user_store_ids())
    )
  );

CREATE POLICY "repmax_sale_items_insert_members"
  ON public.repmax_sale_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.repmax_sales s
      WHERE s.id = sale_id
        AND s.store_id = ANY (public.repmax_user_store_ids())
    )
  );

CREATE POLICY "repmax_sale_items_update_members"
  ON public.repmax_sale_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.repmax_sales s
      WHERE s.id = sale_id
        AND s.store_id = ANY (public.repmax_user_store_ids())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.repmax_sales s
      WHERE s.id = sale_id
        AND s.store_id = ANY (public.repmax_user_store_ids())
    )
  );

-- ============================================================
-- STORAGE: bucket repmax-products (path: {store_id}/...)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'repmax-products',
  'repmax-products',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "repmax_storage_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'repmax-products');

CREATE POLICY "repmax_storage_member_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'repmax-products'
    AND (storage.foldername(name))[1]::uuid = ANY (public.repmax_user_store_ids())
  );

CREATE POLICY "repmax_storage_member_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'repmax-products'
    AND (storage.foldername(name))[1]::uuid = ANY (public.repmax_user_store_ids())
  )
  WITH CHECK (
    bucket_id = 'repmax-products'
    AND (storage.foldername(name))[1]::uuid = ANY (public.repmax_user_store_ids())
  );

CREATE POLICY "repmax_storage_member_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'repmax-products'
    AND (storage.foldername(name))[1]::uuid = ANY (public.repmax_user_store_ids())
  );
