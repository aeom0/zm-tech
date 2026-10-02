-- Panel Ejecutivo de Finanzas: gastos operativos, plantillas recurrentes,
-- gasto Meta Ads diario + log, RPC mensual.
-- tenant_id desde día 1. RLS admin-only SIN aislamiento por tenant.

CREATE TABLE IF NOT EXISTS public.operational_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES public.tenants(id),
  category text NOT NULL CHECK (category IN (
    'alquiler', 'insumos', 'planilla_fija', 'servicios_basicos',
    'marketing', 'mantenimiento', 'comisiones_terceros', 'impuestos', 'otros'
  )),
  label text NOT NULL,
  amount numeric,
  expense_month date NOT NULL,
  expense_date date,
  is_estimated boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN (
    'manual', 'recurring_template', 'whatsapp_ocr'
  )),
  source_ref text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT operational_expenses_tenant_category_label_month_key
    UNIQUE (tenant_id, category, label, expense_month)
);

CREATE INDEX IF NOT EXISTS operational_expenses_tenant_month_idx
  ON public.operational_expenses (tenant_id, expense_month);

COMMENT ON TABLE public.operational_expenses IS
  'Gastos operativos del salón (alquiler, servicios, Sunat…). amount NULL = pendiente de confirmar.';
COMMENT ON COLUMN public.operational_expenses.expense_month IS
  'Primer día del mes que cubre el gasto (normaliza el período).';
COMMENT ON COLUMN public.operational_expenses.amount IS
  'NULL mientras esté pendiente (ej. Sunat antes del PDF NPS).';

DROP TRIGGER IF EXISTS operational_expenses_updated_at ON public.operational_expenses;
CREATE TRIGGER operational_expenses_updated_at
  BEFORE UPDATE ON public.operational_expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.recurring_expense_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES public.tenants(id),
  category text NOT NULL CHECK (category IN (
    'alquiler', 'insumos', 'planilla_fija', 'servicios_basicos',
    'marketing', 'mantenimiento', 'comisiones_terceros', 'impuestos', 'otros'
  )),
  label text NOT NULL,
  day_of_month smallint CHECK (day_of_month IS NULL OR (day_of_month BETWEEN 1 AND 28)),
  default_amount numeric,
  is_variable boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recurring_expense_templates_tenant_category_label_key
    UNIQUE (tenant_id, category, label)
);

COMMENT ON TABLE public.recurring_expense_templates IS
  'Plantillas del cron generate-recurring-expenses. is_variable=true (Sunat) se inserta pendiente el día 1.';

INSERT INTO public.recurring_expense_templates
  (tenant_id, category, label, day_of_month, default_amount, is_variable)
VALUES
  ('zm-lash-nails', 'alquiler',          'Alquiler local',   10, 1200.00, false),
  ('zm-lash-nails', 'servicios_basicos', 'Arbitrios',         10,  138.21, false),
  ('zm-lash-nails', 'otros',             'Contadora',         10,  200.00, false),
  ('zm-lash-nails', 'servicios_basicos', 'Servicios del CC.', 10,  200.00, false),
  ('zm-lash-nails', 'impuestos',         'Sunat',           NULL,    NULL, true)
ON CONFLICT (tenant_id, category, label) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.meta_ads_spend_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES public.tenants(id),
  account_id text NOT NULL,
  spend_date date NOT NULL,
  spend_pen numeric NOT NULL,
  impressions integer,
  clicks integer,
  ctwa_conversations integer,
  synced_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT meta_ads_spend_daily_account_date_key UNIQUE (account_id, spend_date)
);

CREATE INDEX IF NOT EXISTS meta_ads_spend_daily_tenant_date_idx
  ON public.meta_ads_spend_daily (tenant_id, spend_date);

COMMENT ON TABLE public.meta_ads_spend_daily IS
  'Gasto diario Meta Ads (Graph insights). Cuenta ZM: act_2097809460557755. No incluye Zetaeme.';

CREATE TABLE IF NOT EXISTS public.meta_ads_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES public.tenants(id),
  account_id text NOT NULL,
  spend_date date,
  status text NOT NULL CHECK (status IN ('success', 'error')),
  error_message text,
  rows_upserted integer NOT NULL DEFAULT 0 CHECK (rows_upserted >= 0),
  executed_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.meta_ads_sync_log IS
  'Auditoría de sync-meta-ads-spend (éxito/error por corrida).';

CREATE OR REPLACE FUNCTION public.get_monthly_financial_summary(
  p_tenant_id text,
  p_from date,
  p_to date
)
RETURNS TABLE (
  month date,
  revenue numeric,
  expenses numeric,
  ads_spend numeric
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH bounds AS (
    SELECT
      date_trunc('month', p_from)::date AS start_month,
      date_trunc('month', p_to)::date   AS end_month
  ),
  months AS (
    SELECT date_trunc('month', gs)::date AS month
    FROM bounds b
    CROSS JOIN generate_series(b.start_month::timestamp, b.end_month::timestamp, interval '1 month') gs
  )
  SELECT
    m.month,
    coalesce(r.revenue, 0)::numeric,
    coalesce(e.expenses, 0)::numeric,
    coalesce(a.ads_spend, 0)::numeric
  FROM months m
  LEFT JOIN (
    SELECT date_trunc('month', pay.date)::date AS month, sum(pay.amount) AS revenue
    FROM public.payments pay, bounds b
    WHERE pay.tenant_id = p_tenant_id
      AND pay.date >= b.start_month
      AND pay.date < (b.end_month + interval '1 month')
    GROUP BY 1
  ) r ON r.month = m.month
  LEFT JOIN (
    SELECT oe.expense_month AS month, sum(oe.amount) AS expenses
    FROM public.operational_expenses oe, bounds b
    WHERE oe.tenant_id = p_tenant_id
      AND oe.amount IS NOT NULL
      AND oe.expense_month >= b.start_month
      AND oe.expense_month <= b.end_month
    GROUP BY 1
  ) e ON e.month = m.month
  LEFT JOIN (
    SELECT date_trunc('month', ads.spend_date)::date AS month, sum(ads.spend_pen) AS ads_spend
    FROM public.meta_ads_spend_daily ads, bounds b
    WHERE ads.tenant_id = p_tenant_id
      AND ads.spend_date >= b.start_month
      AND ads.spend_date < (b.end_month + interval '1 month')
    GROUP BY 1
  ) a ON a.month = m.month
  ORDER BY 1;
$$;

COMMENT ON FUNCTION public.get_monthly_financial_summary(text, date, date) IS
  'Resumen mensual ingresos/gastos/ads por tenant. Agregación en Postgres (histórico >1000 filas).';

REVOKE ALL ON FUNCTION public.get_monthly_financial_summary(text, date, date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_monthly_financial_summary(text, date, date) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_monthly_financial_summary(text, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_financial_summary(text, date, date) TO service_role;

ALTER TABLE public.operational_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_expense_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ads_spend_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ads_sync_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "operational_expenses_admin_select" ON public.operational_expenses;
CREATE POLICY "operational_expenses_admin_select" ON public.operational_expenses
  FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "operational_expenses_admin_insert" ON public.operational_expenses;
CREATE POLICY "operational_expenses_admin_insert" ON public.operational_expenses
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "operational_expenses_admin_update" ON public.operational_expenses;
CREATE POLICY "operational_expenses_admin_update" ON public.operational_expenses
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "operational_expenses_admin_delete" ON public.operational_expenses;
CREATE POLICY "operational_expenses_admin_delete" ON public.operational_expenses
  FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "recurring_expense_templates_admin_select" ON public.recurring_expense_templates;
CREATE POLICY "recurring_expense_templates_admin_select" ON public.recurring_expense_templates
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "meta_ads_spend_daily_admin_select" ON public.meta_ads_spend_daily;
CREATE POLICY "meta_ads_spend_daily_admin_select" ON public.meta_ads_spend_daily
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "meta_ads_sync_log_admin_select" ON public.meta_ads_sync_log;
CREATE POLICY "meta_ads_sync_log_admin_select" ON public.meta_ads_sync_log
  FOR SELECT TO authenticated USING (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operational_expenses TO authenticated;
GRANT SELECT ON public.recurring_expense_templates TO authenticated;
GRANT SELECT ON public.meta_ads_spend_daily TO authenticated;
GRANT SELECT ON public.meta_ads_sync_log TO authenticated;

GRANT ALL ON public.operational_expenses TO service_role;
GRANT ALL ON public.recurring_expense_templates TO service_role;
GRANT ALL ON public.meta_ads_spend_daily TO service_role;
GRANT ALL ON public.meta_ads_sync_log TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-recurring-expenses-daily-6am-lima') THEN
    PERFORM cron.unschedule('generate-recurring-expenses-daily-6am-lima');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-meta-ads-spend-daily-4am-lima') THEN
    PERFORM cron.unschedule('sync-meta-ads-spend-daily-4am-lima');
  END IF;
END $$;

SELECT cron.schedule(
  'generate-recurring-expenses-daily-6am-lima',
  '0 11 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://udelxwwnyivknslueerr.supabase.co/functions/v1/generate-recurring-expenses',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer 018a377de3c62c57890cbbe3157bff592dcb19b3844b4541317a136ce538a5b8"}'::jsonb,
    body := '{}'::jsonb
  );
  $cron$
);

SELECT cron.schedule(
  'sync-meta-ads-spend-daily-4am-lima',
  '0 9 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://udelxwwnyivknslueerr.supabase.co/functions/v1/sync-meta-ads-spend',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer 018a377de3c62c57890cbbe3157bff592dcb19b3844b4541317a136ce538a5b8"}'::jsonb,
    body := '{}'::jsonb
  );
  $cron$
);

