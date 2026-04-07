-- GeemaStudio: correcciones Database Advisor (security + performance) — mar 2026
-- Aplicar con: MCP apply_migration o psql con DATABASE_URL
-- Excluye auth_leaked_password_protection (plan)
-- Declarativo Drizzle (índices FK + tabla appointment_verifications): packages/shared-schema/src/schema.ts — yarn db:push

-- 1) search_path fijo en funciones (lint 0011)
ALTER FUNCTION public.update_updated_at_column() SET search_path = pg_catalog, public;
ALTER FUNCTION public.get_my_role() SET search_path = pg_catalog, public;
ALTER FUNCTION public.block_role_change_for_non_dev() SET search_path = pg_catalog, public;

-- 2) Índices para FKs (lint 0001)
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON public.appointments (client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_employee_id ON public.appointments (employee_id);
CREATE INDEX IF NOT EXISTS idx_appointments_service_id ON public.appointments (service_id);
CREATE INDEX IF NOT EXISTS idx_payments_appointment_id ON public.payments (appointment_id);
CREATE INDEX IF NOT EXISTS idx_profiles_employee_id ON public.profiles (employee_id);
CREATE INDEX IF NOT EXISTS idx_services_category_id ON public.services (category_id);

-- 3) Quitar políticas duplicadas (lint 0006) y reemplazar por una por comando
-- 4) RLS initplan: (select auth.uid()) donde aplica (lint 0003)

DROP POLICY IF EXISTS "admin puede insertar verificaciones" ON public.appointment_verifications;
DROP POLICY IF EXISTS "admin puede leer verificaciones" ON public.appointment_verifications;

DROP POLICY IF EXISTS appointments_dev_delete ON public.appointments;
DROP POLICY IF EXISTS appointments_owner_delete ON public.appointments;
DROP POLICY IF EXISTS appointments_dev_insert ON public.appointments;
DROP POLICY IF EXISTS appointments_owner_insert ON public.appointments;
DROP POLICY IF EXISTS appointments_staff_insert ON public.appointments;
DROP POLICY IF EXISTS appointments_dev_select ON public.appointments;
DROP POLICY IF EXISTS appointments_owner_select ON public.appointments;
DROP POLICY IF EXISTS appointments_staff_select ON public.appointments;
DROP POLICY IF EXISTS appointments_dev_update ON public.appointments;
DROP POLICY IF EXISTS appointments_owner_update ON public.appointments;
DROP POLICY IF EXISTS appointments_staff_update ON public.appointments;

DROP POLICY IF EXISTS clients_dev_delete ON public.clients;
DROP POLICY IF EXISTS clients_owner_delete ON public.clients;
DROP POLICY IF EXISTS clients_dev_insert ON public.clients;
DROP POLICY IF EXISTS clients_owner_insert ON public.clients;
DROP POLICY IF EXISTS clients_dev_select ON public.clients;
DROP POLICY IF EXISTS clients_owner_select ON public.clients;
DROP POLICY IF EXISTS clients_dev_update ON public.clients;
DROP POLICY IF EXISTS clients_owner_update ON public.clients;

DROP POLICY IF EXISTS employees_dev_delete ON public.employees;
DROP POLICY IF EXISTS employees_owner_delete ON public.employees;
DROP POLICY IF EXISTS employees_dev_insert ON public.employees;
DROP POLICY IF EXISTS employees_owner_insert ON public.employees;
DROP POLICY IF EXISTS employees_dev_select ON public.employees;
DROP POLICY IF EXISTS employees_owner_select ON public.employees;
DROP POLICY IF EXISTS employees_staff_select ON public.employees;
DROP POLICY IF EXISTS employees_dev_update ON public.employees;
DROP POLICY IF EXISTS employees_owner_update ON public.employees;

DROP POLICY IF EXISTS inventory_items_dev_delete ON public.inventory_items;
DROP POLICY IF EXISTS inventory_items_owner_delete ON public.inventory_items;
DROP POLICY IF EXISTS inventory_items_dev_insert ON public.inventory_items;
DROP POLICY IF EXISTS inventory_items_owner_insert ON public.inventory_items;
DROP POLICY IF EXISTS inventory_items_dev_select ON public.inventory_items;
DROP POLICY IF EXISTS inventory_items_owner_select ON public.inventory_items;
DROP POLICY IF EXISTS inventory_items_dev_update ON public.inventory_items;
DROP POLICY IF EXISTS inventory_items_owner_update ON public.inventory_items;

DROP POLICY IF EXISTS packs_dev_delete ON public.packs;
DROP POLICY IF EXISTS packs_owner_delete ON public.packs;
DROP POLICY IF EXISTS packs_dev_insert ON public.packs;
DROP POLICY IF EXISTS packs_owner_insert ON public.packs;
DROP POLICY IF EXISTS packs_dev_select ON public.packs;
DROP POLICY IF EXISTS packs_owner_select ON public.packs;
DROP POLICY IF EXISTS packs_staff_select ON public.packs;
DROP POLICY IF EXISTS packs_dev_update ON public.packs;
DROP POLICY IF EXISTS packs_owner_update ON public.packs;

DROP POLICY IF EXISTS payments_dev_delete ON public.payments;
DROP POLICY IF EXISTS payments_owner_delete ON public.payments;
DROP POLICY IF EXISTS payments_dev_insert ON public.payments;
DROP POLICY IF EXISTS payments_owner_insert ON public.payments;
DROP POLICY IF EXISTS payments_dev_select ON public.payments;
DROP POLICY IF EXISTS payments_owner_select ON public.payments;
DROP POLICY IF EXISTS payments_dev_update ON public.payments;
DROP POLICY IF EXISTS payments_owner_update ON public.payments;

DROP POLICY IF EXISTS profiles_dev_delete ON public.profiles;
DROP POLICY IF EXISTS profiles_owner_delete ON public.profiles;
DROP POLICY IF EXISTS profiles_dev_insert ON public.profiles;
DROP POLICY IF EXISTS profiles_owner_insert ON public.profiles;
DROP POLICY IF EXISTS profiles_dev_select ON public.profiles;
DROP POLICY IF EXISTS profiles_own_select ON public.profiles;
DROP POLICY IF EXISTS profiles_owner_select ON public.profiles;
DROP POLICY IF EXISTS profiles_dev_update ON public.profiles;
DROP POLICY IF EXISTS profiles_owner_update ON public.profiles;
DROP POLICY IF EXISTS profiles_staff_own_update ON public.profiles;

DROP POLICY IF EXISTS promotion_items_dev_delete ON public.promotion_items;
DROP POLICY IF EXISTS promotion_items_owner_delete ON public.promotion_items;
DROP POLICY IF EXISTS promotion_items_dev_insert ON public.promotion_items;
DROP POLICY IF EXISTS promotion_items_owner_insert ON public.promotion_items;
DROP POLICY IF EXISTS promotion_items_dev_select ON public.promotion_items;
DROP POLICY IF EXISTS promotion_items_owner_select ON public.promotion_items;
DROP POLICY IF EXISTS promotion_items_staff_select ON public.promotion_items;
DROP POLICY IF EXISTS promotion_items_dev_update ON public.promotion_items;
DROP POLICY IF EXISTS promotion_items_owner_update ON public.promotion_items;

DROP POLICY IF EXISTS promotions_dev_delete ON public.promotions;
DROP POLICY IF EXISTS promotions_owner_delete ON public.promotions;
DROP POLICY IF EXISTS promotions_dev_insert ON public.promotions;
DROP POLICY IF EXISTS promotions_owner_insert ON public.promotions;
DROP POLICY IF EXISTS promotions_dev_select ON public.promotions;
DROP POLICY IF EXISTS promotions_owner_select ON public.promotions;
DROP POLICY IF EXISTS promotions_staff_select ON public.promotions;
DROP POLICY IF EXISTS promotions_dev_update ON public.promotions;
DROP POLICY IF EXISTS promotions_owner_update ON public.promotions;

DROP POLICY IF EXISTS service_categories_dev_delete ON public.service_categories;
DROP POLICY IF EXISTS service_categories_owner_delete ON public.service_categories;
DROP POLICY IF EXISTS service_categories_dev_insert ON public.service_categories;
DROP POLICY IF EXISTS service_categories_owner_insert ON public.service_categories;
DROP POLICY IF EXISTS service_categories_dev_select ON public.service_categories;
DROP POLICY IF EXISTS service_categories_owner_select ON public.service_categories;
DROP POLICY IF EXISTS service_categories_staff_select ON public.service_categories;
DROP POLICY IF EXISTS service_categories_dev_update ON public.service_categories;
DROP POLICY IF EXISTS service_categories_owner_update ON public.service_categories;

DROP POLICY IF EXISTS services_dev_delete ON public.services;
DROP POLICY IF EXISTS services_owner_delete ON public.services;
DROP POLICY IF EXISTS services_dev_insert ON public.services;
DROP POLICY IF EXISTS services_owner_insert ON public.services;
DROP POLICY IF EXISTS services_dev_select ON public.services;
DROP POLICY IF EXISTS services_owner_select ON public.services;
DROP POLICY IF EXISTS services_staff_select ON public.services;
DROP POLICY IF EXISTS services_dev_update ON public.services;
DROP POLICY IF EXISTS services_owner_update ON public.services;

DROP POLICY IF EXISTS tenant_settings_dev_delete ON public.tenant_settings;
DROP POLICY IF EXISTS tenant_settings_owner_delete ON public.tenant_settings;
DROP POLICY IF EXISTS tenant_settings_dev_insert ON public.tenant_settings;
DROP POLICY IF EXISTS tenant_settings_owner_insert ON public.tenant_settings;
DROP POLICY IF EXISTS tenant_settings_dev_select ON public.tenant_settings;
DROP POLICY IF EXISTS tenant_settings_owner_select ON public.tenant_settings;
DROP POLICY IF EXISTS tenant_settings_dev_update ON public.tenant_settings;
DROP POLICY IF EXISTS tenant_settings_owner_update ON public.tenant_settings;

-- appointment_verifications: admin dev/owner (initplan-safe)
CREATE POLICY appointment_verifications_admin_select ON public.appointment_verifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = ANY (ARRAY['owner'::text, 'dev'::text])
    )
  );

CREATE POLICY appointment_verifications_admin_insert ON public.appointment_verifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = ANY (ARRAY['owner'::text, 'dev'::text])
    )
  );

-- appointments: staff participa en lectura/escritura de citas
CREATE POLICY appointments_delete_admin ON public.appointments
  FOR DELETE USING (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]));

CREATE POLICY appointments_insert_roles ON public.appointments
  FOR INSERT WITH CHECK (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text, 'staff'::text]));

CREATE POLICY appointments_select_roles ON public.appointments
  FOR SELECT USING (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text, 'staff'::text]));

CREATE POLICY appointments_update_roles ON public.appointments
  FOR UPDATE
  USING (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text, 'staff'::text]))
  WITH CHECK (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text, 'staff'::text]));

-- clients: solo dev/owner
CREATE POLICY clients_delete_admin ON public.clients
  FOR DELETE USING (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]));

CREATE POLICY clients_insert_admin ON public.clients
  FOR INSERT WITH CHECK (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]));

CREATE POLICY clients_select_admin ON public.clients
  FOR SELECT USING (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]));

CREATE POLICY clients_update_admin ON public.clients
  FOR UPDATE
  USING (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]))
  WITH CHECK (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]));

-- employees: staff solo lectura
CREATE POLICY employees_delete_admin ON public.employees
  FOR DELETE USING (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]));

CREATE POLICY employees_insert_admin ON public.employees
  FOR INSERT WITH CHECK (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]));

CREATE POLICY employees_select_all ON public.employees
  FOR SELECT USING (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text, 'staff'::text]));

CREATE POLICY employees_update_admin ON public.employees
  FOR UPDATE
  USING (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]))
  WITH CHECK (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]));

-- inventory_items
CREATE POLICY inventory_items_delete_admin ON public.inventory_items
  FOR DELETE USING (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]));

CREATE POLICY inventory_items_insert_admin ON public.inventory_items
  FOR INSERT WITH CHECK (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]));

CREATE POLICY inventory_items_select_admin ON public.inventory_items
  FOR SELECT USING (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]));

CREATE POLICY inventory_items_update_admin ON public.inventory_items
  FOR UPDATE
  USING (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]))
  WITH CHECK (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]));

-- packs
CREATE POLICY packs_delete_admin ON public.packs
  FOR DELETE USING (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]));

CREATE POLICY packs_insert_admin ON public.packs
  FOR INSERT WITH CHECK (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]));

CREATE POLICY packs_select_all ON public.packs
  FOR SELECT USING (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text, 'staff'::text]));

CREATE POLICY packs_update_admin ON public.packs
  FOR UPDATE
  USING (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]))
  WITH CHECK (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]));

-- payments
CREATE POLICY payments_delete_admin ON public.payments
  FOR DELETE USING (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]));

CREATE POLICY payments_insert_admin ON public.payments
  FOR INSERT WITH CHECK (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]));

CREATE POLICY payments_select_admin ON public.payments
  FOR SELECT USING (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]));

CREATE POLICY payments_update_admin ON public.payments
  FOR UPDATE
  USING (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]))
  WITH CHECK (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]));

-- profiles: propio registro + admins
CREATE POLICY profiles_delete_admin ON public.profiles
  FOR DELETE USING (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]));

CREATE POLICY profiles_insert_admin ON public.profiles
  FOR INSERT WITH CHECK (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]));

CREATE POLICY profiles_select_own_or_admin ON public.profiles
  FOR SELECT USING (
    id = (SELECT auth.uid())
    OR get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text])
  );

CREATE POLICY profiles_update_mixed ON public.profiles
  FOR UPDATE
  USING (
    get_my_role() = 'dev'::text
    OR get_my_role() = 'owner'::text
    OR (
      id = (SELECT auth.uid())
      AND get_my_role() = 'staff'::text
    )
  )
  WITH CHECK (
    get_my_role() = 'dev'::text
    OR get_my_role() = 'owner'::text
    OR (
      id = (SELECT auth.uid())
      AND get_my_role() = 'staff'::text
      AND role = 'staff'::text
    )
  );

-- promotion_items
CREATE POLICY promotion_items_delete_admin ON public.promotion_items
  FOR DELETE USING (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]));

CREATE POLICY promotion_items_insert_admin ON public.promotion_items
  FOR INSERT WITH CHECK (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]));

CREATE POLICY promotion_items_select_all ON public.promotion_items
  FOR SELECT USING (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text, 'staff'::text]));

CREATE POLICY promotion_items_update_admin ON public.promotion_items
  FOR UPDATE
  USING (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]))
  WITH CHECK (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]));

-- promotions
CREATE POLICY promotions_delete_admin ON public.promotions
  FOR DELETE USING (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]));

CREATE POLICY promotions_insert_admin ON public.promotions
  FOR INSERT WITH CHECK (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]));

CREATE POLICY promotions_select_all ON public.promotions
  FOR SELECT USING (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text, 'staff'::text]));

CREATE POLICY promotions_update_admin ON public.promotions
  FOR UPDATE
  USING (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]))
  WITH CHECK (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]));

-- service_categories
CREATE POLICY service_categories_delete_admin ON public.service_categories
  FOR DELETE USING (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]));

CREATE POLICY service_categories_insert_admin ON public.service_categories
  FOR INSERT WITH CHECK (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]));

CREATE POLICY service_categories_select_all ON public.service_categories
  FOR SELECT USING (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text, 'staff'::text]));

CREATE POLICY service_categories_update_admin ON public.service_categories
  FOR UPDATE
  USING (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]))
  WITH CHECK (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]));

-- services
CREATE POLICY services_delete_admin ON public.services
  FOR DELETE USING (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]));

CREATE POLICY services_insert_admin ON public.services
  FOR INSERT WITH CHECK (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]));

CREATE POLICY services_select_all ON public.services
  FOR SELECT USING (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text, 'staff'::text]));

CREATE POLICY services_update_admin ON public.services
  FOR UPDATE
  USING (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]))
  WITH CHECK (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]));

-- tenant_settings
CREATE POLICY tenant_settings_delete_admin ON public.tenant_settings
  FOR DELETE USING (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]));

CREATE POLICY tenant_settings_insert_admin ON public.tenant_settings
  FOR INSERT WITH CHECK (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]));

CREATE POLICY tenant_settings_select_admin ON public.tenant_settings
  FOR SELECT USING (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]));

CREATE POLICY tenant_settings_update_admin ON public.tenant_settings
  FOR UPDATE
  USING (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]))
  WITH CHECK (get_my_role() = ANY (ARRAY['dev'::text, 'owner'::text]));
