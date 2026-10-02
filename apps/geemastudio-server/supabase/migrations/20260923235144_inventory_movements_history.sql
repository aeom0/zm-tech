CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'zm-lash-nails',
  item_id varchar NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  quantity_before integer NOT NULL,
  quantity_after integer NOT NULL,
  reason text NOT NULL DEFAULT 'manual_adjustment',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX inventory_movements_tenant_created_idx
  ON public.inventory_movements (tenant_id, created_at DESC);

CREATE INDEX inventory_movements_item_created_idx
  ON public.inventory_movements (item_id, created_at DESC);

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_movements_admin_select"
  ON public.inventory_movements
  FOR SELECT
  USING (public.is_admin() AND tenant_id = public.current_tenant_id());

CREATE POLICY "inventory_movements_admin_insert"
  ON public.inventory_movements
  FOR INSERT
  WITH CHECK (public.is_admin() AND tenant_id = public.current_tenant_id());

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
  v_tenant_id text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'solo admin';
  END IF;

  v_tenant_id := public.current_tenant_id();

  SELECT quantity
    INTO v_quantity
    FROM public.inventory_items
   WHERE id = p_item_id
     AND tenant_id = v_tenant_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ítem de inventario no encontrado';
  END IF;

  v_next_quantity := GREATEST(0, v_quantity + COALESCE(p_delta, 0));

  UPDATE public.inventory_items
     SET quantity = v_next_quantity
   WHERE id = p_item_id
     AND tenant_id = v_tenant_id;

  IF v_next_quantity <> v_quantity THEN
    INSERT INTO public.inventory_movements (
      tenant_id,
      item_id,
      delta,
      quantity_before,
      quantity_after,
      created_by
    )
    VALUES (
      v_tenant_id,
      p_item_id,
      v_next_quantity - v_quantity,
      v_quantity,
      v_next_quantity,
      auth.uid()
    );
  END IF;

  RETURN v_next_quantity;
END;
$$;

REVOKE ALL ON FUNCTION public.adjust_inventory_quantity(varchar, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_inventory_quantity(varchar, integer) TO authenticated;
