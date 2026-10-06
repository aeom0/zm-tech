-- Imágenes CTWA de Uñas — panel /panel/waba/campanas
-- Idempotente: no duplica si ya existen las claves.

INSERT INTO public.waba_config (
  id,
  config_key,
  label,
  category,
  config_value,
  is_active,
  sort_order,
  updated_at,
  tenant_id
)
VALUES
  (gen_random_uuid(), 'meta_ads_unas_image_1_url', 'Uñas imagen 1 (CTWA)', 'campanas', '{"url":""}'::jsonb, true, 30, now(), 'zm-lash-nails'),
  (gen_random_uuid(), 'meta_ads_unas_image_1_caption', 'Pie Uñas imagen 1', 'campanas', '{"text":""}'::jsonb, true, 31, now(), 'zm-lash-nails'),
  (gen_random_uuid(), 'meta_ads_unas_image_2_url', 'Uñas imagen 2 (CTWA)', 'campanas', '{"url":""}'::jsonb, true, 32, now(), 'zm-lash-nails'),
  (gen_random_uuid(), 'meta_ads_unas_image_2_caption', 'Pie Uñas imagen 2', 'campanas', '{"text":""}'::jsonb, true, 33, now(), 'zm-lash-nails')
ON CONFLICT (tenant_id, config_key) DO NOTHING;
