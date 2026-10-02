ALTER TABLE public.waba_template_analytics_daily RENAME COLUMN read TO read_count;
COMMENT ON COLUMN public.waba_template_analytics_daily.read_count IS 'Meta template_analytics READ metric';
