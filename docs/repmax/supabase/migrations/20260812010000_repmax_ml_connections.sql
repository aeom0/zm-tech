-- Conexión OAuth de MercadoLibre por tienda (1:1).
-- Tokens SOLO los escribe service_role desde Edge Functions.
-- El cliente jamás inserta/actualiza directo; solo lee status y DELETE (owner).
-- Alcance: SOLO public.repmax_ml_connections (no tocar odental_*, hub_*, contacts, quote_leads).
-- Proyecto: llacowjutjfefboqgfnj
-- Helper: public.repmax_user_role_in_store(p_store_id uuid) → public.repmax_store_user_role
-- NO aplicar sin confirmación explícita de Alberto.

CREATE TABLE IF NOT EXISTS public.repmax_ml_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.repmax_stores(id) ON DELETE CASCADE,

  ml_user_id bigint NOT NULL,
  site_id text NOT NULL DEFAULT 'MLV',
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,

  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'revoked')),

  connected_by uuid REFERENCES public.repmax_store_users(id),
  connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uniq_repmax_ml_connections_store UNIQUE (store_id)
);

COMMENT ON TABLE public.repmax_ml_connections IS
  'Tokens OAuth de MercadoLibre por tienda. access_token/refresh_token solo escritos por service_role (Edge Functions), nunca por el cliente.';

CREATE TRIGGER trg_repmax_ml_connections_updated_at
  BEFORE UPDATE ON public.repmax_ml_connections
  FOR EACH ROW EXECUTE FUNCTION public.repmax_set_updated_at();

ALTER TABLE public.repmax_ml_connections ENABLE ROW LEVEL SECURITY;

-- SELECT: miembros de la tienda ven la fila (el cliente no pide columnas de token).
CREATE POLICY "repmax_ml_connections_select"
  ON public.repmax_ml_connections FOR SELECT
  TO authenticated
  USING (
    public.repmax_ml_connections.store_id = ANY (public.repmax_user_store_ids())
  );

-- INSERT/UPDATE: sin policy para authenticated → solo service_role (bypassa RLS).

-- DELETE (desconectar): solo el owner.
CREATE POLICY "repmax_ml_connections_delete_owner"
  ON public.repmax_ml_connections FOR DELETE
  TO authenticated
  USING (
    public.repmax_user_role_in_store(public.repmax_ml_connections.store_id) = 'owner'
  );

GRANT SELECT, DELETE ON public.repmax_ml_connections TO authenticated;
REVOKE ALL ON public.repmax_ml_connections FROM anon;
