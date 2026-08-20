-- Fase 0 del asistente de ventas por WhatsApp (plan 10-PLAN-waba-sales-assistant.md).
-- Prototipo interno/demo en sandbox de Meta, single-tenant (WHATSAPP_DEMO_STORE_ID).
-- Solo las 2 tablas mínimas para Fase 0: conversación + log de mensajes.
-- repmax_wa_intent_log y repmax_wa_staff_sessions quedan para Fase 1 (handoff).
-- Alcance: SOLO public.repmax_wa_conversations y public.repmax_wa_messages.
-- Proyecto: llacowjutjfefboqgfnj

CREATE TABLE IF NOT EXISTS public.repmax_wa_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.repmax_stores(id) ON DELETE CASCADE,
  phone text NOT NULL,
  step text NOT NULL DEFAULT 'browsing',
  session_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  bot_paused_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uniq_repmax_wa_conversations_store_phone UNIQUE (store_id, phone)
);

COMMENT ON TABLE public.repmax_wa_conversations IS
  'Hilo de conversación WhatsApp por (store_id, phone). Fase 0: solo escrito por service_role desde el Edge Function whatsapp-webhook.';

CREATE TRIGGER trg_repmax_wa_conversations_updated_at
  BEFORE UPDATE ON public.repmax_wa_conversations
  FOR EACH ROW EXECUTE FUNCTION public.repmax_set_updated_at();

ALTER TABLE public.repmax_wa_conversations ENABLE ROW LEVEL SECURITY;
-- Sin policies para authenticated/anon: acceso exclusivo service_role (bypassa RLS).
REVOKE ALL ON public.repmax_wa_conversations FROM authenticated, anon;

CREATE TABLE IF NOT EXISTS public.repmax_wa_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.repmax_wa_conversations(id) ON DELETE CASCADE,
  wamid text UNIQUE,
  direction text NOT NULL CHECK (direction IN ('in', 'out')),
  content text,
  intent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.repmax_wa_messages IS
  'Log de mensajes entrantes/salientes por conversación. wamid único para dedupe de reintentos de Meta. intent solo poblado en mensajes entrantes clasificados (Grupo A).';

CREATE INDEX IF NOT EXISTS idx_repmax_wa_messages_conversation
  ON public.repmax_wa_messages (conversation_id, created_at);

ALTER TABLE public.repmax_wa_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.repmax_wa_messages FROM authenticated, anon;
