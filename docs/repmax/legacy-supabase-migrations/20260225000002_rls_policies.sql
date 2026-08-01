-- ============================================================
-- TORQUEA BUSINESS SUITE — Row Level Security (RLS)
-- Migración 002 — Políticas de seguridad multi-tenant
-- ============================================================

-- Función helper: retorna los store_ids del usuario autenticado
CREATE OR REPLACE FUNCTION get_user_store_ids()
RETURNS UUID[] AS $$
  SELECT ARRAY(
    SELECT store_id FROM store_users
    WHERE user_id = auth.uid() AND is_active = true
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Función helper: retorna el role del usuario en una tienda
CREATE OR REPLACE FUNCTION get_user_role_in_store(p_store_id UUID)
RETURNS store_user_role AS $$
  SELECT role FROM store_users
  WHERE user_id = auth.uid()
    AND store_id = p_store_id
    AND is_active = true
  LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- RLS: STORES
-- ============================================================
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stores_select_own" ON stores
  FOR SELECT USING (id = ANY(get_user_store_ids()));

CREATE POLICY "stores_update_owner" ON stores
  FOR UPDATE USING (
    get_user_role_in_store(id) = 'owner'
  );

-- ============================================================
-- RLS: STORE_USERS
-- ============================================================
ALTER TABLE store_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "store_users_select_own" ON store_users
  FOR SELECT USING (store_id = ANY(get_user_store_ids()));

CREATE POLICY "store_users_insert_owner" ON store_users
  FOR INSERT WITH CHECK (
    get_user_role_in_store(store_id) = 'owner'
  );

CREATE POLICY "store_users_update_owner" ON store_users
  FOR UPDATE USING (
    get_user_role_in_store(store_id) = 'owner'
  );

-- ============================================================
-- RLS: PRODUCTS
-- ============================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_all_store_members" ON products
  FOR ALL USING (store_id = ANY(get_user_store_ids()));

-- ============================================================
-- RLS: CUSTOMERS
-- ============================================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_all_store_members" ON customers
  FOR ALL USING (store_id = ANY(get_user_store_ids()));

-- ============================================================
-- RLS: SALES
-- ============================================================
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_all_store_members" ON sales
  FOR ALL USING (store_id = ANY(get_user_store_ids()));

-- ============================================================
-- RLS: SALE_ITEMS
-- ============================================================
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sale_items_all_store_members" ON sale_items
  FOR ALL USING (
    sale_id IN (
      SELECT id FROM sales WHERE store_id = ANY(get_user_store_ids())
    )
  );

-- ============================================================
-- RLS: CASH_SESSIONS
-- ============================================================
ALTER TABLE cash_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cash_sessions_all_store_members" ON cash_sessions
  FOR ALL USING (store_id = ANY(get_user_store_ids()));
