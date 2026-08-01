-- ============================================================
-- TORQUEA BUSINESS SUITE — Schema Multi-tenant con RLS
-- Migración 001 — Schema inicial
-- ============================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE vehicle_type AS ENUM ('CAR', 'MOTO', 'TRUCK', 'SUV');
CREATE TYPE part_condition AS ENUM ('NEW', 'USED');
CREATE TYPE payment_method AS ENUM (
  'CASH_USD', 'CASH_BS', 'ZELLE',
  'PAGO_MOVIL', 'TRANSFERENCIA', 'MIXED'
);
CREATE TYPE sale_status AS ENUM ('COMPLETED', 'CANCELLED', 'REFUNDED');
CREATE TYPE cash_session_status AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE store_user_role AS ENUM ('owner', 'cashier', 'inventory');
CREATE TYPE subscription_plan AS ENUM ('basic', 'pro', 'enterprise');

-- ============================================================
-- STORES (raíz del tenant)
-- ============================================================
CREATE TABLE stores (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  slug          VARCHAR(100) UNIQUE NOT NULL,
  logo_url      TEXT,
  phone         VARCHAR(50),
  address       TEXT,
  city          VARCHAR(100),
  custom_domain VARCHAR(255),
  plan          subscription_plan DEFAULT 'basic',
  is_active     BOOLEAN DEFAULT true,
  currency_usd  VARCHAR(10) DEFAULT 'USD',
  currency_bs   VARCHAR(10) DEFAULT 'BS',
  usd_bs_rate   DECIMAL(10,2) DEFAULT 36.50,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STORE_USERS (empleados con roles por tienda)
-- ============================================================
CREATE TABLE store_users (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id   UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       store_user_role NOT NULL DEFAULT 'cashier',
  full_name  VARCHAR(255),
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, user_id)
);

-- ============================================================
-- PRODUCTS (inventario de la tienda)
-- ============================================================
CREATE TABLE products (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id     UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  title        VARCHAR(255) NOT NULL,
  description  TEXT,
  brand        VARCHAR(100) NOT NULL,
  model        VARCHAR(100) NOT NULL,
  year_from    INTEGER,
  year_to      INTEGER,
  vehicle_type vehicle_type,
  condition    part_condition DEFAULT 'NEW',
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
-- CUSTOMERS (mecánicos y clientes frecuentes)
-- ============================================================
CREATE TABLE customers (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id         UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
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
-- CASH_SESSIONS (apertura/cierre de caja)
-- ============================================================
CREATE TABLE cash_sessions (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id                    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  cashier_id                  UUID REFERENCES store_users(id) ON DELETE SET NULL,
  status                      cash_session_status DEFAULT 'OPEN',
  opening_amount_usd          DECIMAL(12,2) DEFAULT 0,
  closing_amount_usd          DECIMAL(12,2),
  total_sales_usd             DECIMAL(12,2),
  total_by_payment_method     JSONB DEFAULT '{}',
  opened_at                   TIMESTAMPTZ DEFAULT NOW(),
  closed_at                   TIMESTAMPTZ,
  notes                       TEXT
);

-- ============================================================
-- SALES (transacciones del POS)
-- ============================================================
CREATE TABLE sales (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  session_id      UUID REFERENCES cash_sessions(id) ON DELETE SET NULL,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  cashier_id      UUID REFERENCES store_users(id) ON DELETE SET NULL,
  invoice_number  VARCHAR(50),
  total_usd       DECIMAL(12,2) NOT NULL,
  total_bs        DECIMAL(14,2),
  usd_bs_rate     DECIMAL(10,2),
  payment_method  payment_method NOT NULL DEFAULT 'CASH_USD',
  payment_details JSONB DEFAULT '{}',
  status          sale_status DEFAULT 'COMPLETED',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SALE_ITEMS (líneas de detalle de cada venta)
-- ============================================================
CREATE TABLE sale_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id          UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id       UUID REFERENCES products(id) ON DELETE SET NULL,
  product_snapshot JSONB NOT NULL,
  quantity         INTEGER NOT NULL DEFAULT 1,
  unit_price_usd   DECIMAL(12,2) NOT NULL,
  subtotal_usd     DECIMAL(12,2) NOT NULL
);

-- ============================================================
-- ÍNDICES DE PERFORMANCE
-- ============================================================
CREATE INDEX idx_store_users_store    ON store_users(store_id);
CREATE INDEX idx_store_users_user     ON store_users(user_id);
CREATE INDEX idx_products_store       ON products(store_id);
CREATE INDEX idx_products_brand       ON products(store_id, brand);
CREATE INDEX idx_products_stock       ON products(store_id, stock);
CREATE INDEX idx_products_condition   ON products(store_id, condition);
CREATE INDEX idx_customers_store      ON customers(store_id);
CREATE INDEX idx_sales_store_date     ON sales(store_id, created_at DESC);
CREATE INDEX idx_sales_session        ON sales(session_id);
CREATE INDEX idx_sale_items_sale      ON sale_items(sale_id);
CREATE INDEX idx_cash_sessions_store  ON cash_sessions(store_id, opened_at DESC);

-- ============================================================
-- FUNCIÓN: actualizar updated_at automáticamente
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
