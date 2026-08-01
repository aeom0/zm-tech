-- Storefront público solo para anon; miembros usan policy de tienda
DROP POLICY IF EXISTS "repmax_products_select_public_active" ON public.repmax_products;
CREATE POLICY "repmax_products_select_public_active"
  ON public.repmax_products FOR SELECT
  TO anon
  USING (is_active = true);

DROP POLICY IF EXISTS "repmax_stores_select_public_active" ON public.repmax_stores;
CREATE POLICY "repmax_stores_select_public_active"
  ON public.repmax_stores FOR SELECT
  TO anon
  USING (is_active = true);
