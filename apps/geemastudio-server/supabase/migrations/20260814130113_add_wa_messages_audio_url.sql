ALTER TABLE public.wa_messages
  ADD COLUMN IF NOT EXISTS audio_url text;

COMMENT ON COLUMN public.wa_messages.audio_url IS 'URL pública del audio (Storage waba-audio) cuando msg_type=audio';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'waba-audio',
  'waba-audio',
  true,
  16777216,
  ARRAY['audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/amr']
)
ON CONFLICT (id) DO NOTHING;
