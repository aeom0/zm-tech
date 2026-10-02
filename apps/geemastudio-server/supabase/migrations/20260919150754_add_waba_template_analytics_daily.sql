-- Fase 5: drill-down Meta template_analytics → Finanzas (Geema S5C-7)
CREATE TABLE IF NOT EXISTS public.waba_template_analytics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'zm-lash-nails',
  waba_id text NOT NULL,
  date date NOT NULL,
  template_id text NOT NULL,
  template_name text NOT NULL DEFAULT '',
  sent integer NOT NULL DEFAULT 0 CHECK (sent >= 0),
  delivered integer NOT NULL DEFAULT 0 CHECK (delivered >= 0),
  read integer NOT NULL DEFAULT 0 CHECK (read >= 0),
  clicked integer NOT NULL DEFAULT 0 CHECK (clicked >= 0),
  cost numeric(10, 4) CHECK (cost IS NULL OR cost >= 0),
  synced_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS waba_template_analytics_daily_dims_unique
  ON public.waba_template_analytics_daily (waba_id, date, template_id);

CREATE INDEX IF NOT EXISTS waba_template_analytics_daily_date_idx
  ON public.waba_template_analytics_daily (date);

CREATE INDEX IF NOT EXISTS idx_waba_template_analytics_daily_tenant_id
  ON public.waba_template_analytics_daily (tenant_id);

COMMENT ON TABLE public.waba_template_analytics_daily IS
  'Métricas diarias por plantilla WABA (Meta template_analytics: sent/delivered/read/clicked/cost). Sync vía waba-pricing-sync.';

ALTER TABLE public.waba_template_analytics_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS waba_template_analytics_daily_admin_select ON public.waba_template_analytics_daily;
CREATE POLICY waba_template_analytics_daily_admin_select
  ON public.waba_template_analytics_daily
  FOR SELECT TO authenticated
  USING (
    (EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = ANY (ARRAY['dev'::text, 'owner'::text])
    ))
    AND tenant_id = public.current_tenant_id()
  );

GRANT SELECT ON public.waba_template_analytics_daily TO authenticated;

