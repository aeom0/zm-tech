ALTER TABLE public.wa_messages
  ADD COLUMN IF NOT EXISTS reply_to_wamid text,
  ADD COLUMN IF NOT EXISTS reply_image_url text;

COMMENT ON COLUMN public.wa_messages.reply_to_wamid IS
  'wamid del mensaje citado (Meta message.context.id) cuando la clienta hace swipe-reply';
COMMENT ON COLUMN public.wa_messages.reply_image_url IS
  'URL denormalizada de la imagen citada (si el quote es msg_type=image) para el panel';

CREATE INDEX IF NOT EXISTS wa_messages_reply_to_wamid_idx
  ON public.wa_messages (reply_to_wamid)
  WHERE reply_to_wamid IS NOT NULL;
