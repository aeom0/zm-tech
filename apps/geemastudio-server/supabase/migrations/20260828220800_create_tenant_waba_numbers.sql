CREATE TABLE IF NOT EXISTS public.tenant_waba_numbers (
  phone_number_id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES public.tenants (id),
  waba_id text,
  display_phone_e164 text,
  label text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenant_waba_numbers_display_e164_check
    CHECK (
      display_phone_e164 IS NULL
      OR display_phone_e164 ~ '^[0-9]{8,15}$'
    )
);

CREATE INDEX IF NOT EXISTS idx_tenant_waba_numbers_tenant_id
  ON public.tenant_waba_numbers (tenant_id);

CREATE UNIQUE INDEX IF NOT EXISTS tenant_waba_numbers_tenant_display_unique
  ON public.tenant_waba_numbers (tenant_id, display_phone_e164)
  WHERE display_phone_e164 IS NOT NULL;

COMMENT ON TABLE public.tenant_waba_numbers IS
  'Mapeo Meta phone_number_id → tenant. Seed ZM bot +51 981 444 430. Resolver en S3.';

ALTER TABLE public.tenant_waba_numbers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_waba_numbers_admin_select ON public.tenant_waba_numbers;
CREATE POLICY tenant_waba_numbers_admin_select ON public.tenant_waba_numbers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = ANY (ARRAY['dev'::text, 'owner'::text])
    )
    AND tenant_id = public.current_tenant_id()
  );

DROP POLICY IF EXISTS tenant_waba_numbers_admin_write ON public.tenant_waba_numbers;
CREATE POLICY tenant_waba_numbers_admin_write ON public.tenant_waba_numbers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = ANY (ARRAY['dev'::text, 'owner'::text])
    )
    AND tenant_id = public.current_tenant_id()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = ANY (ARRAY['dev'::text, 'owner'::text])
    )
    AND tenant_id = public.current_tenant_id()
  );

INSERT INTO public.tenant_waba_numbers (
  phone_number_id,
  tenant_id,
  waba_id,
  display_phone_e164,
  label,
  is_active
) VALUES (
  '1013353341861346',
  'zm-lash-nails',
  '1271330085100222',
  '51981444430',
  'ZM Bot WhatsApp',
  true
)
ON CONFLICT (phone_number_id) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id,
  waba_id = COALESCE(EXCLUDED.waba_id, public.tenant_waba_numbers.waba_id),
  display_phone_e164 = COALESCE(EXCLUDED.display_phone_e164, public.tenant_waba_numbers.display_phone_e164),
  label = COALESCE(EXCLUDED.label, public.tenant_waba_numbers.label),
  is_active = EXCLUDED.is_active,
  updated_at = now();
