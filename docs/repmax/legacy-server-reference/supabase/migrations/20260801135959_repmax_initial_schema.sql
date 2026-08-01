-- Prefijo repmax_ obligatorio: BD compartida con contacts, quote_leads, odental_*.
-- NUNCA tocar contacts, quote_leads ni odental_*.
-- Sin tabla users local: auth.users de Supabase.

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE repmax_vehicle_type AS ENUM ('CAR', 'MOTO', 'TRUCK', 'SUV');
CREATE TYPE repmax_part_condition AS ENUM ('NEW', 'USED');
CREATE TYPE repmax_payment_method AS ENUM (
  'CASH_USD', 'CASH_BS', 'ZELLE',
  'PAGO_MOVIL', 'TRANSFERENCIA', 'MIXED'
);
CREATE TYPE repmax_sale_status AS ENUM ('COMPLETED', 'CANCELLED', 'REFUNDED');
CREATE TYPE repmax_cash_session_status AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE repmax_store_user_role AS ENUM ('owner', 'cashier', 'inventory');
CREATE TYPE repmax_subscription_plan AS ENUM ('basic', 'pro', 'enterprise');

-- ============================================================
-- STORES
-- ============================================================
CREATE TABLE repmax_stores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  slug          VARCHAR(100) NOT NULL,
  logo_url      TEXT,
  phone         VARCHAR(50),
  address       TEXT,
  city          VARCHAR(100),
  custom_domain VARCHAR(255),
  plan          repmax_subscription_plan DEFAULT 'basic',
  is_active     BOOLEAN DEFAULT true,
  currency_usd  VARCHAR(10) DEFAULT 'USD',
  currency_bs   VARCHAR(10) DEFAULT 'BS',
  usd_bs_rate   DECIMAL(10,2) DEFAULT 36.50,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uniq_repmax_stores_slug UNIQUE (slug)
);

-- ============================================================
-- STORE_USERS (user_id → auth.users)
-- ============================================================
CREATE TABLE repmax_store_users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID NOT NULL REFERENCES repmax_stores(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       repmax_store_user_role NOT NULL DEFAULT 'cashier',
  full_name  VARCHAR(255),
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uniq_repmax_store_user UNIQUE (store_id, user_id)
);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE repmax_products (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     UUID NOT NULL REFERENCES repmax_stores(id) ON DELETE CASCADE,
  title        VARCHAR(255) NOT NULL,
  description  TEXT,
  brand        VARCHAR(100) NOT NULL,
  model        VARCHAR(100) NOT NULL,
  year_from    INTEGER,
  year_to      INTEGER,
  vehicle_type repmax_vehicle_type,
  condition    repmax_part_condition DEFAULT 'NEW',
  part_number  VARCHAR(100),
  price_usd    DECIMAL(12,2) NOT NULL,
  price_bs     DECIMAL(14,2),
  stock        INTEGER DEFAULT 0,
  min_stock    INTEGER DEFAULT 1,
  photos       TEXT[],
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE repmax_customers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         UUID NOT NULL REFERENCES repmax_stores(id) ON DELETE CASCADE,
  full_name        VARCHAR(255) NOT NULL,
  phone            VARCHAR(50),
  cedula_rif       VARCHAR(20),
  email            VARCHAR(255),
  notes            TEXT,
  total_purchases  INTEGER DEFAULT 0,
  total_spent_usd  DECIMAL(12,2) DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CASH_SESSIONS
-- ============================================================
CREATE TABLE repmax_cash_sessions (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id                    UUID NOT NULL REFERENCES repmax_stores(id) ON DELETE CASCADE,
  cashier_id                  UUID REFERENCES repmax_store_users(id) ON DELETE SET NULL,
  status                      repmax_cash_session_status DEFAULT 'OPEN',
  opening_amount_usd          DECIMAL(12,2) DEFAULT 0,
  closing_amount_usd          DECIMAL(12,2),
  total_sales_usd             DECIMAL(12,2),
  total_by_payment_method     JSONB DEFAULT '{}',
  opened_at                   TIMESTAMPTZ DEFAULT NOW(),
  closed_at                   TIMESTAMPTZ,
  notes                       TEXT
);

-- ============================================================
-- SALES
-- ============================================================
CREATE TABLE repmax_sales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES repmax_stores(id) ON DELETE CASCADE,
  session_id      UUID REFERENCES repmax_cash_sessions(id) ON DELETE SET NULL,
  customer_id     UUID REFERENCES repmax_customers(id) ON DELETE SET NULL,
  cashier_id      UUID REFERENCES repmax_store_users(id) ON DELETE SET NULL,
  invoice_number  VARCHAR(50),
  total_usd       DECIMAL(12,2) NOT NULL,
  total_bs        DECIMAL(14,2),
  usd_bs_rate     DECIMAL(10,2),
  payment_method  repmax_payment_method NOT NULL DEFAULT 'CASH_USD',
  payment_details JSONB DEFAULT '{}',
  status          repmax_sale_status DEFAULT 'COMPLETED',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SALE_ITEMS
-- ============================================================
CREATE TABLE repmax_sale_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id          UUID NOT NULL REFERENCES repmax_sales(id) ON DELETE CASCADE,
  product_id       UUID REFERENCES repmax_products(id) ON DELETE SET NULL,
  product_snapshot JSONB NOT NULL,
  quantity         INTEGER NOT NULL DEFAULT 1,
  unit_price_usd   DECIMAL(12,2) NOT NULL,
  subtotal_usd     DECIMAL(12,2) NOT NULL
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX idx_repmax_store_users_store ON repmax_store_users(store_id);
CREATE INDEX idx_repmax_store_users_user ON repmax_store_users(user_id);
CREATE INDEX idx_repmax_products_store ON repmax_products(store_id);
CREATE INDEX idx_repmax_products_brand ON repmax_products(store_id, brand);
CREATE INDEX idx_repmax_products_stock ON repmax_products(store_id, stock);
CREATE INDEX idx_repmax_products_condition ON repmax_products(store_id, condition);
CREATE INDEX idx_repmax_customers_store ON repmax_customers(store_id);
CREATE INDEX idx_repmax_sales_store_date ON repmax_sales(store_id, created_at DESC);
CREATE INDEX idx_repmax_sales_session ON repmax_sales(session_id);
CREATE INDEX idx_repmax_sale_items_sale ON repmax_sale_items(sale_id);
CREATE INDEX idx_repmax_cash_sessions_store ON repmax_cash_sessions(store_id, opened_at DESC);

-- ============================================================
-- updated_at (prefijado para no colisionar con otros verticales)
-- ============================================================
CREATE OR REPLACE FUNCTION public.repmax_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_repmax_stores_updated_at
  BEFORE UPDATE ON repmax_stores
  FOR EACH ROW EXECUTE FUNCTION public.repmax_set_updated_at();

CREATE TRIGGER trg_repmax_products_updated_at
  BEFORE UPDATE ON repmax_products
  FOR EACH ROW EXECUTE FUNCTION public.repmax_set_updated_at();

-- Grants (remoto ZMTech no auto-expone tablas nuevas)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repmax_stores TO authenticated;
GRANT SELECT ON public.repmax_stores TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repmax_store_users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repmax_products TO authenticated;
GRANT SELECT ON public.repmax_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repmax_customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repmax_cash_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repmax_sales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repmax_sale_items TO authenticated;
