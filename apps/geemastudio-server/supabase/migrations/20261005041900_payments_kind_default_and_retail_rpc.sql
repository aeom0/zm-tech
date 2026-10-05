-- Cualquier escritor que no mande kind (agenda, dashboard, webhook) queda clasificado.
CREATE OR REPLACE FUNCTION public.payments_set_default_kind()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.kind IS NULL THEN
    NEW.kind := CASE WHEN NEW.is_abono THEN 'deposit' ELSE 'service' END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payments_set_default_kind ON public.payments;
CREATE TRIGGER payments_set_default_kind
  BEFORE INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.payments_set_default_kind();

-- Venta retail: el pago nace como product.
CREATE OR REPLACE FUNCTION public.mark_product_order_paid(
  p_order_id uuid,
  p_method text DEFAULT 'cash'::text,
  p_notes text DEFAULT NULL::text
)
RETURNS character varying
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_order public.product_orders%ROWTYPE;
  v_payment_id varchar;
  v_amount numeric(10,2);
  v_item_name text;
  v_stock integer;
  v_tenant_id text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'solo admin';
  END IF;

  v_tenant_id := public.current_tenant_id();

  SELECT *
    INTO v_order
    FROM public.product_orders
   WHERE id = p_order_id
     AND tenant_id = v_tenant_id
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

  SELECT name, quantity
    INTO v_item_name, v_stock
    FROM public.inventory_items
   WHERE id = v_order.inventory_item_id
     AND tenant_id = v_tenant_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'producto no encontrado';
  END IF;

  v_amount := round(v_order.unit_price * v_order.quantity, 2);
  v_payment_id := gen_random_uuid()::varchar;

  IF v_order.status = 'reserved' AND COALESCE(v_stock, 0) < v_order.quantity THEN
    RAISE EXCEPTION 'stock insuficiente';
  END IF;

  INSERT INTO public.payments (
    id, tenant_id, appointment_id, amount, method, date, notes, is_abono, kind
  )
  VALUES (
    v_payment_id,
    v_tenant_id,
    NULL,
    v_amount,
    COALESCE(NULLIF(trim(p_method), ''), 'cash'),
    now(),
    COALESCE(
      NULLIF(trim(p_notes), ''),
      CASE WHEN v_order.status = 'pedido' THEN 'Pedido retail: '
           ELSE 'Venta retail: '
      END
      || COALESCE(v_item_name, 'producto')
      || CASE WHEN v_order.client_name <> '' THEN ' — ' || v_order.client_name ELSE '' END
    ),
    false,
    'product'
  );

  IF v_order.status = 'reserved' THEN
    UPDATE public.inventory_items
       SET quantity = quantity - v_order.quantity
     WHERE id = v_order.inventory_item_id
       AND tenant_id = v_tenant_id;

    INSERT INTO public.inventory_movements (
      tenant_id, item_id, delta, quantity_before, quantity_after, reason, created_by
    )
    VALUES (
      v_tenant_id,
      v_order.inventory_item_id,
      -v_order.quantity,
      v_stock,
      v_stock - v_order.quantity,
      'retail_sale',
      auth.uid()
    );
  END IF;

  UPDATE public.product_orders
     SET status = 'paid',
         payment_id = v_payment_id,
         payment_method = COALESCE(NULLIF(trim(p_method), ''), 'cash'),
         paid_at = now()
   WHERE id = p_order_id
     AND tenant_id = v_tenant_id;

  RETURN v_payment_id;
END;
$function$;
