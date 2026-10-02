ALTER TABLE public.product_orders DROP CONSTRAINT IF EXISTS product_orders_status_check;
ALTER TABLE public.product_orders
  ADD CONSTRAINT product_orders_status_check
  CHECK (status IN ('reserved', 'pedido', 'paid', 'delivered', 'cancelled'));

COMMENT ON COLUMN public.product_orders.status IS
  'reserved=apartado con stock; pedido=sin stock/preventa; paid; delivered; cancelled';

-- mark paid also allows pedido (cobro de preventa: no baja stock si no hay)
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
  v_stock integer;
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

  IF v_order.status NOT IN ('reserved', 'pedido') THEN
    RAISE EXCEPTION 'estado no cobrable: %', v_order.status;
  END IF;

  SELECT name, quantity INTO v_item_name, v_stock
  FROM public.inventory_items
  WHERE id = v_order.inventory_item_id
  FOR UPDATE;

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
      CASE WHEN v_order.status = 'pedido' THEN 'Pedido retail: ' ELSE 'Venta retail: ' END
        || COALESCE(v_item_name, 'producto') ||
        CASE WHEN v_order.client_name <> '' THEN ' — ' || v_order.client_name ELSE '' END
    ),
    false
  );

  -- Solo baja stock si hay unidades (apartado con stock). Pedido/preventa no descuenta.
  IF v_order.status = 'reserved' THEN
    IF COALESCE(v_stock, 0) < v_order.quantity THEN
      RAISE EXCEPTION 'stock insuficiente';
    END IF;
    UPDATE public.inventory_items
    SET quantity = quantity - v_order.quantity
    WHERE id = v_order.inventory_item_id;
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
