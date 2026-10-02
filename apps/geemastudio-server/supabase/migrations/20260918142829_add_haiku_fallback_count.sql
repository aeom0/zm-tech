ALTER TABLE public.whatsapp_sessions
  ADD COLUMN IF NOT EXISTS haiku_fallback_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.whatsapp_sessions.haiku_fallback_count IS
  'Fallos consecutivos de Haiku (trigger fallback) para este teléfono. Se resetea a 0 cuando Haiku resuelve un mensaje; al llegar a 3 el dispatcher pausa el bot (bot_paused_at) y notifica al staff.';
