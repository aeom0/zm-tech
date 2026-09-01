-- UNIQUE por tenant: permite mismo feriado nacional en N tenants
ALTER TABLE public.salon_holidays DROP CONSTRAINT IF EXISTS salon_holidays_date_unique;
ALTER TABLE public.salon_holidays DROP CONSTRAINT IF EXISTS salon_holidays_tenant_date_unique;
ALTER TABLE public.salon_holidays
  ADD CONSTRAINT salon_holidays_tenant_date_unique UNIQUE (tenant_id, date);
