
-- Plan 07: look_preview_* + seed estilos Vertex v1 (ZM)

CREATE TABLE IF NOT EXISTS look_preview_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES tenants(id),
  phone text NOT NULL,
  bsuid text,
  client_id text REFERENCES clients(id),
  session_token uuid NOT NULL DEFAULT gen_random_uuid(),
  pack text NOT NULL CHECK (pack IN ('initial_s5', 'extra_s8')),
  category_key text NOT NULL,
  style_key text,
  credits_total int NOT NULL,
  credits_used int NOT NULL DEFAULT 0,
  amount_pen numeric(10,2) NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  status text NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN (
      'pending_payment', 'paid', 'generating', 'ready', 'failed'
    )),
  payment_provider text,
  payment_ref text,
  payment_ref_code char(4),
  selfie_path text,
  yape_audit jsonb,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS look_preview_orders_ref_code_pending
  ON look_preview_orders (tenant_id, payment_ref_code)
  WHERE payment_status = 'pending' AND payment_ref_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS look_preview_orders_phone_idx
  ON look_preview_orders (tenant_id, phone, created_at DESC);

CREATE TABLE IF NOT EXISTS look_preview_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES tenants(id),
  order_id uuid NOT NULL REFERENCES look_preview_orders(id) ON DELETE CASCADE,
  style_key text NOT NULL,
  source_storage_path text NOT NULL,
  result_storage_path text NOT NULL,
  haiku_validation jsonb,
  vertex_meta jsonb,
  latency_ms int,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS look_preview_results_order_idx
  ON look_preview_results (order_id);

CREATE TABLE IF NOT EXISTS look_preview_styles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES tenants(id),
  category_key text NOT NULL,
  style_key text NOT NULL,
  display_name text NOT NULL,
  prompt_template text NOT NULL,
  constraints_template text,
  technique_note text,
  mapping_mm text,
  visual_diff text,
  portfolio_image_path text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, category_key, style_key)
);

ALTER TABLE look_preview_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE look_preview_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE look_preview_styles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS look_preview_styles_select_auth ON look_preview_styles;
CREATE POLICY look_preview_styles_select_auth ON look_preview_styles
  FOR SELECT TO authenticated
  USING (
    tenant_id = COALESCE(
      (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()),
      'zm-lash-nails'
    )
  );

DROP POLICY IF EXISTS look_preview_orders_select_auth ON look_preview_orders;
CREATE POLICY look_preview_orders_select_auth ON look_preview_orders
  FOR SELECT TO authenticated
  USING (
    tenant_id = COALESCE(
      (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()),
      'zm-lash-nails'
    )
  );

DROP POLICY IF EXISTS look_preview_results_select_auth ON look_preview_results;
CREATE POLICY look_preview_results_select_auth ON look_preview_results
  FOR SELECT TO authenticated
  USING (
    tenant_id = COALESCE(
      (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()),
      'zm-lash-nails'
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'look_preview_orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE look_preview_orders;
  END IF;
END $$;

