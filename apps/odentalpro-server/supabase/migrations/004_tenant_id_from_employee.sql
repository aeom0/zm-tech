-- 004_tenant_id_from_employee.sql (aplicada en remoto 23-jul-2026)
-- Resuelve tenant vía JWT claim o odental_employees.auth_user_id

CREATE OR REPLACE FUNCTION public.odental_current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    public.odental_jwt_tenant_id(),
    (
      SELECT e.tenant_id
      FROM odental_employees e
      WHERE e.auth_user_id = auth.uid()
      LIMIT 1
    )
  );
$$;
