ALTER TABLE public.inventory_movements
  DROP CONSTRAINT inventory_movements_item_id_fkey;

ALTER TABLE public.inventory_movements
  ALTER COLUMN item_id DROP NOT NULL;

ALTER TABLE public.inventory_movements
  ADD CONSTRAINT inventory_movements_item_id_fkey
  FOREIGN KEY (item_id)
  REFERENCES public.inventory_items(id)
  ON DELETE SET NULL;
