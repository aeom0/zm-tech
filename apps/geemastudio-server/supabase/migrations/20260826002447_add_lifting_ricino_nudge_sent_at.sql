ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS lifting_ricino_nudge_sent_at timestamptz;

COMMENT ON COLUMN public.appointments.lifting_ricino_nudge_sent_at IS
  'Timestamp envío plantilla lifting_cuidados_ricino_zm (~día 10 post-lifting). NULL = no enviado.';
