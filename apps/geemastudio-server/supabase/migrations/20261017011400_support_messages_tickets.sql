-- Agente de soporte por WhatsApp (plan-agente-soporte-zmtech.md, F1).
-- Historial del número de soporte y tickets escalados a una persona.
-- `product` deja listo el soporte multiproducto; hoy solo 'geemastudio'.
-- RLS cerrada sin políticas: solo la Edge Function `support-webhook` con service role.

CREATE TABLE public.support_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product text NOT NULL DEFAULT 'geemastudio' CHECK (product IN ('geemastudio')),
  phone text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('in', 'out')),
  msg_type text NOT NULL DEFAULT 'text',
  body text NOT NULL DEFAULT '',
  wamid text UNIQUE,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX support_messages_phone_created_idx
  ON public.support_messages (product, phone, created_at DESC);

CREATE TABLE public.support_tickets (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product text NOT NULL DEFAULT 'geemastudio' CHECK (product IN ('geemastudio')),
  contact_phone text NOT NULL,
  contact_name text,
  tenant_id text REFERENCES public.tenants (id) ON DELETE SET NULL,
  summary text NOT NULL,
  diagnosis jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX support_tickets_tenant_id_idx ON public.support_tickets (tenant_id);
CREATE INDEX support_tickets_open_phone_idx
  ON public.support_tickets (product, contact_phone, created_at DESC)
  WHERE status <> 'resolved';

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.support_messages FROM anon, authenticated;
REVOKE ALL ON public.support_tickets FROM anon, authenticated;

COMMENT ON TABLE public.support_messages IS
  'Historial del WhatsApp de soporte de ZM Tech (no se mezcla con wa_messages). Solo service_role.';
COMMENT ON TABLE public.support_tickets IS
  'Casos escalados por el agente de soporte a una persona. Solo service_role.';
