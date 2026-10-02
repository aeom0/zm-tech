-- Normaliza timestamps de eventos reales para que representen instantes UTC.
--
-- appointments.date se conserva como timestamp sin zona: representa la hora de
-- pared del tenant y debe seguir usando el timezone configurado del negocio.
--
-- Los valores existentes de estas columnas fueron escritos como reloj UTC
-- (now() sobre columnas timestamp sin zona). AT TIME ZONE 'UTC' conserva el
-- instante correcto al convertirlos a timestamptz.
ALTER TABLE public.payments
  ALTER COLUMN date TYPE timestamptz
  USING date AT TIME ZONE 'UTC';

ALTER TABLE public.product_orders
  ALTER COLUMN created_at TYPE timestamptz
  USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN paid_at TYPE timestamptz
  USING paid_at AT TIME ZONE 'UTC',
  ALTER COLUMN delivered_at TYPE timestamptz
  USING delivered_at AT TIME ZONE 'UTC',
  ALTER COLUMN cancelled_at TYPE timestamptz
  USING cancelled_at AT TIME ZONE 'UTC';

-- El default histórico de payments apuntaba siempre al tenant ZM Lash.
-- La RPC debe escribir explícitamente el tenant autenticado.
ALTER TABLE public.payments
  ALTER COLUMN tenant_id DROP DEFAULT;

CREATE OR REPLACE FUNCTION public.mark_product_order_paid(
  p_order_id uuid,
  p_method text DEFAULT 'cash',
  p_notes text DEFAULT NULL
)
RETURNS varchar
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    id, tenant_id, appointment_id, amount, method, date, notes, is_abono
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
    false
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
