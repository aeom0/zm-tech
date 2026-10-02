alter table appointment_verifications
  add column if not exists kind text not null default 'deposit'
    check (kind in ('deposit', 'post_service_payment'));

comment on column appointment_verifications.kind is
  'deposit = flujo pre-cita (abono 20%/50%/fijo S/25, confirma cita al aprobar). '
  'post_service_payment = comprobante recibido fuera de flujo/post-servicio, '
  'aprobar NO cambia appointments.status ni reenvía políticas.';

INSERT INTO public.waba_config (config_key, label, category, config_value, is_active, sort_order, tenant_id)
VALUES
  (
    'image_classification_enabled',
    'Clasificación de imágenes inbound (Haiku Vision)',
    'mensajes',
    jsonb_build_object('enabled', true),
    true,
    50,
    'zm-lash-nails'
  )
ON CONFLICT (config_key) DO NOTHING;
