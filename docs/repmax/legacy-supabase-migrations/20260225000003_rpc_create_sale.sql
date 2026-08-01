-- ============================================================
-- RPC: create_sale_with_items
-- Crea una venta y sus items en una transacción atómica,
-- descontando el stock de cada producto automáticamente.
-- ============================================================
CREATE OR REPLACE FUNCTION create_sale_with_items(
  p_store_id        UUID,
  p_session_id      UUID,
  p_customer_id     UUID,
  p_cashier_id      UUID,
  p_payment_method  payment_method,
  p_payment_details JSONB,
  p_usd_bs_rate     DECIMAL,
  p_notes           TEXT,
  p_items           JSONB  -- Array de {product_id, quantity, unit_price_usd, product_snapshot}
)
RETURNS UUID AS $$
DECLARE
  v_sale_id       UUID;
  v_total_usd     DECIMAL := 0;
  v_item          JSONB;
  v_subtotal      DECIMAL;
BEGIN
  -- Calcular total
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_total_usd := v_total_usd +
      (v_item->>'quantity')::INTEGER * (v_item->>'unit_price_usd')::DECIMAL;
  END LOOP;

  -- Insertar venta
  INSERT INTO sales (
    store_id, session_id, customer_id, cashier_id,
    total_usd, total_bs, usd_bs_rate,
    payment_method, payment_details, notes
  ) VALUES (
    p_store_id, p_session_id, p_customer_id, p_cashier_id,
    v_total_usd, v_total_usd * p_usd_bs_rate, p_usd_bs_rate,
    p_payment_method, p_payment_details, p_notes
  ) RETURNING id INTO v_sale_id;

  -- Insertar items y descontar stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_subtotal := (v_item->>'quantity')::INTEGER *
                  (v_item->>'unit_price_usd')::DECIMAL;

    INSERT INTO sale_items (
      sale_id, product_id, product_snapshot,
      quantity, unit_price_usd, subtotal_usd
    ) VALUES (
      v_sale_id,
      (v_item->>'product_id')::UUID,
      v_item->'product_snapshot',
      (v_item->>'quantity')::INTEGER,
      (v_item->>'unit_price_usd')::DECIMAL,
      v_subtotal
    );

    -- Descontar stock atómicamente
    UPDATE products
    SET stock = stock - (v_item->>'quantity')::INTEGER
    WHERE id = (v_item->>'product_id')::UUID
      AND store_id = p_store_id;
  END LOOP;

  -- Actualizar totales del cliente si aplica
  IF p_customer_id IS NOT NULL THEN
    UPDATE customers
    SET
      total_purchases = total_purchases + 1,
      total_spent_usd = total_spent_usd + v_total_usd
    WHERE id = p_customer_id AND store_id = p_store_id;
  END IF;

  RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
