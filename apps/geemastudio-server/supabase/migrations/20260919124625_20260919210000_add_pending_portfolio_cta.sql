ALTER TABLE public.whatsapp_sessions
  ADD COLUMN IF NOT EXISTS pending_portfolio_cta_at timestamptz;

COMMENT ON COLUMN public.whatsapp_sessions.pending_portfolio_cta_at IS
  'Cuándo Haiku ofreció portafolio condicional ("¿quieres ver fotos reales?", action:none); si >10 min, el "Sii" corto ya no aplica.';

