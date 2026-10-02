-- Plan 17 Fase 1 — Planes de suscripción (fuente única para landing, panel web y mobile).
-- Sin cobro: plan_code y subscription_status se asignan a mano en esta fase de prueba.

-- 1. Catálogo de planes
CREATE TABLE IF NOT EXISTS public.plans (
  code text PRIMARY KEY CHECK (code ~ '^[a-z][a-z0-9_]*$'),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  monthly_price integer NOT NULL CHECK (monthly_price >= 0),
  annual_price integer NOT NULL CHECK (annual_price >= 0),
  max_branches integer CHECK (max_branches IS NULL OR max_branches > 0),
  max_staff integer CHECK (max_staff IS NULL OR max_staff > 0),
  waba_conversations integer CHECK (waba_conversations IS NULL OR waba_conversations >= 0),
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  waba_features jsonb NOT NULL DEFAULT '[]'::jsonb,
  highlighted boolean NOT NULL DEFAULT false,
  cta text NOT NULL DEFAULT 'Empezar gratis',
  sort_order integer NOT NULL DEFAULT 0,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.plans IS
  'Catalogo de planes Geema (Plan 17). max_* / waba_conversations NULL = ilimitado.';

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY plans_public_read ON public.plans
  FOR SELECT TO anon, authenticated
  USING (is_public);

REVOKE ALL ON public.plans FROM anon, authenticated;
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT ALL ON public.plans TO service_role;

INSERT INTO public.plans
  (code, name, description, monthly_price, annual_price, max_branches, max_staff, waba_conversations,
   features, waba_features, highlighted, cta, sort_order)
VALUES
  ('basic', 'Basic', 'Para empezar a organizarte', 19, 15, 1, 3, 50,
   '["1 sede","Hasta 3 empleados","Agenda de citas","Catálogo de servicios","App móvil (iOS + Android)","Soporte por email"]'::jsonb,
   '["WhatsApp 24/7 con asistente IA","50 conversaciones/mes incluidas","Add-on: +50 conv. por $4"]'::jsonb,
   false, 'Empezar gratis', 1),
  ('pro', 'Pro', 'El más popular para negocios en crecimiento', 45, 36, 3, 15, 300,
   '["3 sedes","Hasta 15 empleados","Todo lo de Basic","Control de inventario","Finanzas y reportes","Notificaciones push a clientes","Comisiones automáticas","Soporte prioritario"]'::jsonb,
   '["WhatsApp 24/7 con asistente IA","300 conversaciones/mes incluidas","Envío de promos masivas por WA"]'::jsonb,
   true, 'Empezar gratis', 2),
  ('elite', 'Elite', 'Para cadenas y franquicias', 89, 71, NULL, NULL, NULL,
   '["Sedes ilimitadas","Empleados ilimitados","Todo lo de Pro","Reportes avanzados","Branding personalizado","Integraciones API","Manager dedicado","SLA garantizado"]'::jsonb,
   '["WhatsApp 24/7 con asistente IA avanzada","Conversaciones ilimitadas","Flujo de pago por captura WA","Foto previa al servicio por WA"]'::jsonb,
   false, 'Contactar ventas', 3)
ON CONFLICT (code) DO NOTHING;

-- 2. Suscripción en tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS plan_code text NOT NULL DEFAULT 'basic' REFERENCES public.plans(code),
  ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'annual')),
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'trial'
    CHECK (subscription_status IN ('trial', 'active', 'past_due', 'canceled'));

-- ZM Lash entra con plan Pro (decision 2-oct-2026).
UPDATE public.tenants
SET plan_code = 'pro', subscription_status = 'active'
WHERE id = 'zm-lash-nails';

-- 3. Vista de suscripción del tenant del JWT + uso actual.
-- security_invoker: respeta tenants_select_own y el RLS de employees (solo ve su tenant).
CREATE OR REPLACE VIEW public.tenant_subscription
WITH (security_invoker = true)
AS
SELECT
  t.id AS tenant_id,
  t.plan_code,
  t.billing_cycle,
  t.subscription_status,
  t.trial_ends_at,
  p.name AS plan_name,
  p.monthly_price,
  p.annual_price,
  p.max_branches,
  p.max_staff,
  p.waba_conversations,
  p.features,
  p.waba_features,
  (SELECT count(*)::integer FROM public.employees e
    WHERE e.tenant_id = t.id AND e.is_active) AS staff_count
FROM public.tenants t
JOIN public.plans p ON p.code = t.plan_code
WHERE t.id = public.current_tenant_id();

REVOKE ALL ON public.tenant_subscription FROM anon, authenticated;
GRANT SELECT ON public.tenant_subscription TO authenticated;
GRANT ALL ON public.tenant_subscription TO service_role;
