-- 003_auth_tenant_claims.sql (aplicada en remoto 23-jul-2026)
-- auth_user_id + helper JWT + policies con WITH CHECK
-- Ver también 004_tenant_id_from_employee.sql

ALTER TABLE odental_employees
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS odental_employees_auth_user_id_idx
  ON odental_employees (auth_user_id);

CREATE OR REPLACE FUNCTION public.odental_jwt_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() ->> 'tenant_id', ''),
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'tenant_id', '')
  )::uuid;
$$;
