-- mark_product_order_paid solo para sesiones autenticadas (la función igual exige is_admin()).
REVOKE EXECUTE ON FUNCTION public.mark_product_order_paid(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_product_order_paid(uuid, text, text) TO authenticated, service_role;
