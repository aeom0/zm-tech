-- Retail: productos vendibles + órdenes/apartados
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS is_sellable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS description text;

COMMENT ON COLUMN public.inventory_items.is_sellable IS 'Si true, aparece en catálogo de venta retail (panel Productos).';
COMMENT ON COLUMN public.inventory_items.description IS 'Ficha corta para staff/bot (qué es / cómo se usa).';
COMMENT ON COLUMN public.inventory_items.price IS 'Precio de venta al público cuando is_sellable=true.';

CREATE TABLE IF NOT EXISTS public.product_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'zm-lash-nails',
  inventory_item_id varchar NOT NULL REFERENCES public.inventory_items(id),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric(10,2) NOT NULL,
  client_id varchar REFERENCES public.clients(id),
  client_name text NOT NULL DEFAULT '',
  client_phone text,
  status text NOT NULL DEFAULT 'reserved'
    CHECK (status IN ('reserved', 'paid', 'delivered', 'cancelled')),
  payment_id varchar REFERENCES public.payments(id),
  payment_method text,
  source text NOT NULL DEFAULT 'salon'
    CHECK (source IN ('salon', 'whatsapp', 'promo')),
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  paid_at timestamp without time zone,
  delivered_at timestamp without time zone,
  cancelled_at timestamp without time zone
);

CREATE INDEX IF NOT EXISTS idx_product_orders_tenant_status
  ON public.product_orders (tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_orders_item
  ON public.product_orders (inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_product_orders_client_phone
  ON public.product_orders (client_phone);

ALTER TABLE public.product_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_orders_admin_select ON public.product_orders;
CREATE POLICY product_orders_admin_select ON public.product_orders
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS product_orders_admin_insert ON public.product_orders;
CREATE POLICY product_orders_admin_insert ON public.product_orders
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS product_orders_admin_update ON public.product_orders;
CREATE POLICY product_orders_admin_update ON public.product_orders
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS product_orders_admin_delete ON public.product_orders;
CREATE POLICY product_orders_admin_delete ON public.product_orders
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- Marca pagado: crea payment, baja stock, actualiza orden (atómico)
CREATE OR REPLACE FUNCTION public.mark_product_order_paid(
  p_order_id uuid,
  p_method text DEFAULT 'cash',
  p_notes text DEFAULT NULL
) RETURNS varchar
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.product_orders%ROWTYPE;
  v_payment_id varchar;
  v_amount numeric(10,2);
  v_item_name text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'solo admin';
  END IF;

  SELECT * INTO v_order
  FROM public.product_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'orden no encontrada';
  END IF;

  IF v_order.status = 'cancelled' THEN
    RAISE EXCEPTION 'orden cancelada';
  END IF;

  IF v_order.status IN ('paid', 'delivered') AND v_order.payment_id IS NOT NULL THEN
    RETURN v_order.payment_id;
  END IF;

  SELECT name INTO v_item_name FROM public.inventory_items WHERE id = v_order.inventory_item_id;
  v_amount := round(v_order.unit_price * v_order.quantity, 2);
  v_payment_id := gen_random_uuid()::varchar;

  INSERT INTO public.payments (id, appointment_id, amount, method, date, notes, is_abono)
  VALUES (
    v_payment_id,
    NULL,
    v_amount,
    COALESCE(NULLIF(trim(p_method), ''), 'cash'),
    now(),
    COALESCE(
      NULLIF(trim(p_notes), ''),
      'Venta retail: ' || COALESCE(v_item_name, 'producto') ||
        CASE WHEN v_order.client_name <> '' THEN ' — ' || v_order.client_name ELSE '' END
    ),
    false
  );

  UPDATE public.inventory_items
  SET quantity = quantity - v_order.quantity
  WHERE id = v_order.inventory_item_id
    AND quantity >= v_order.quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'stock insuficiente';
  END IF;

  UPDATE public.product_orders
  SET
    status = 'paid',
    payment_id = v_payment_id,
    payment_method = COALESCE(NULLIF(trim(p_method), ''), 'cash'),
    paid_at = now()
  WHERE id = p_order_id;

  RETURN v_payment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_product_order_paid(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_product_order_paid(uuid, text, text) TO authenticated;

-- Seed kit cuidado pestañas (idempotente por nombre)
INSERT INTO public.inventory_items (
  name, type, category, quantity, min_stock, unit, price, cost, is_sellable, description
)
SELECT
  'Kit cuidado pestañas',
  'countable',
  'pestanas_cejas',
  20,
  5,
  'kit',
  16.00,
  NULL,
  true,
  'Kit ZM: shampoo mousse 60 ml + peine + cepillo limpiador. Ideal con extensiones: limpia, protege y ayuda a que duren más. Uso en rutina diaria en casa.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.inventory_items WHERE name = 'Kit cuidado pestañas'
);
