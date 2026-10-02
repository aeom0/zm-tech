CREATE OR REPLACE FUNCTION public.adjust_inventory_quantity(
  p_item_id varchar,
  p_delta integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quantity integer;
  v_next_quantity integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'solo admin';
  END IF;

  SELECT quantity
    INTO v_quantity
    FROM public.inventory_items
   WHERE id = p_item_id
     AND tenant_id = public.current_tenant_id()
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ítem de inventario no encontrado';
  END IF;

  v_next_quantity := GREATEST(0, v_quantity + COALESCE(p_delta, 0));

  UPDATE public.inventory_items
     SET quantity = v_next_quantity
   WHERE id = p_item_id
     AND tenant_id = public.current_tenant_id();

  RETURN v_next_quantity;
END;
$$;

REVOKE ALL ON FUNCTION public.adjust_inventory_quantity(varchar, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_inventory_quantity(varchar, integer) TO authenticated;
