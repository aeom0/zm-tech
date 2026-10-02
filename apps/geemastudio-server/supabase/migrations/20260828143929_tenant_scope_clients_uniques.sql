DROP INDEX IF EXISTS clients_wa_user_id_unique;
CREATE UNIQUE INDEX IF NOT EXISTS clients_tenant_wa_user_id_unique
  ON public.clients (tenant_id, wa_user_id)
  WHERE wa_user_id IS NOT NULL;

DROP INDEX IF EXISTS clients_phone_country_normalized_unique;
CREATE UNIQUE INDEX IF NOT EXISTS clients_tenant_phone_country_normalized_unique
  ON public.clients (tenant_id, phone_country, phone_normalized)
  WHERE phone_normalized IS NOT NULL;

DROP INDEX IF EXISTS clients_dni_unique;
CREATE UNIQUE INDEX IF NOT EXISTS clients_tenant_dni_unique
  ON public.clients (tenant_id, dni)
  WHERE dni IS NOT NULL;
