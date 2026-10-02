-- Imágenes segmentadas CTWA (Extensiones / Lifting) — panel /panel/waba/campanas
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
  (gen_random_uuid(), 'meta_ads_extensiones_image_1_url', 'Extensiones imagen 1 (CTWA)', 'campanas', '{"url":""}'::jsonb, true, 22, now(), 'zm-lash-nails'),
  (gen_random_uuid(), 'meta_ads_extensiones_image_1_caption', 'Pie Extensiones imagen 1', 'campanas', '{"text":""}'::jsonb, true, 23, now(), 'zm-lash-nails'),
  (gen_random_uuid(), 'meta_ads_extensiones_image_2_url', 'Extensiones imagen 2 (CTWA)', 'campanas', '{"url":""}'::jsonb, true, 24, now(), 'zm-lash-nails'),
  (gen_random_uuid(), 'meta_ads_extensiones_image_2_caption', 'Pie Extensiones imagen 2', 'campanas', '{"text":""}'::jsonb, true, 25, now(), 'zm-lash-nails'),
  (gen_random_uuid(), 'meta_ads_lifting_image_1_url', 'Lifting imagen 1 (CTWA)', 'campanas', '{"url":""}'::jsonb, true, 26, now(), 'zm-lash-nails'),
  (gen_random_uuid(), 'meta_ads_lifting_image_1_caption', 'Pie Lifting imagen 1', 'campanas', '{"text":""}'::jsonb, true, 27, now(), 'zm-lash-nails'),
  (gen_random_uuid(), 'meta_ads_lifting_image_2_url', 'Lifting imagen 2 (CTWA)', 'campanas', '{"url":""}'::jsonb, true, 28, now(), 'zm-lash-nails'),
  (gen_random_uuid(), 'meta_ads_lifting_image_2_caption', 'Pie Lifting imagen 2', 'campanas', '{"text":""}'::jsonb, true, 29, now(), 'zm-lash-nails')
ON CONFLICT (config_key) DO NOTHING;
