-- Curso de extensiones (lead form) — Johanna …9981 / Vanessa.
-- Editable en /panel/waba/campanas → Contenido del bot.

INSERT INTO public.waba_config (
  id,
  tenant_id,
  config_key,
  label,
  category,
  config_value,
  is_active,
  sort_order,
  updated_at
)
VALUES (
  gen_random_uuid(),
  'zm-lash-nails',
  'cursos_extensiones_text',
  'Curso extensiones — lead form',
  'mensajes',
  jsonb_build_object(
    'text',
    E'Si, hacemos cursos especializados en extensiones de pestañas personalizado 🌷\n\nBrindarme los siguientes datos para poder enviarte la información:\n\n🌸 Nombre y Apellidos:\n🪻 N° de whatsapp:\n\n🌸 ¿Cuál es el nivel en que te encuentras en extensiones de pestañas?\n\n🌷 Nivel principiante ó nivel medio?'
  ),
  true,
  4,
  now()
)
ON CONFLICT DO NOTHING;

-- Asegurar unique (tenant_id, config_key) no choque: si ya existe, actualizar texto.
UPDATE public.waba_config
SET
  config_value = jsonb_build_object(
    'text',
    E'Si, hacemos cursos especializados en extensiones de pestañas personalizado 🌷\n\nBrindarme los siguientes datos para poder enviarte la información:\n\n🌸 Nombre y Apellidos:\n🪻 N° de whatsapp:\n\n🌸 ¿Cuál es el nivel en que te encuentras en extensiones de pestañas?\n\n🌷 Nivel principiante ó nivel medio?'
  ),
  label = 'Curso extensiones — lead form',
  is_active = true,
  updated_at = now()
WHERE tenant_id = 'zm-lash-nails'
  AND config_key = 'cursos_extensiones_text';

-- Empujar sort_order de clases al 4.5 → dejar cursos en 4 y clases en 5, retiro en 6
UPDATE public.waba_config
SET sort_order = 5, updated_at = now()
WHERE tenant_id = 'zm-lash-nails' AND config_key = 'clases_text';

UPDATE public.waba_config
SET sort_order = 6, updated_at = now()
WHERE tenant_id = 'zm-lash-nails' AND config_key = 'retiro_otro_salon_text';

UPDATE public.waba_config
SET sort_order = 4, updated_at = now()
WHERE tenant_id = 'zm-lash-nails' AND config_key = 'cursos_extensiones_text';
