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
VALUES
  (
    gen_random_uuid(),
    'zm-lash-nails',
    'emotional_almost_close_lines_ext',
    'Casi cierra — frases Extensiones (CTWA)',
    'campanas',
    jsonb_build_object(
      'lines',
      jsonb_build_array(
        'Esa mirada que viste en el anuncio puede ser tuya ✨ Solo falta elegir el día — date ese momento para ti.',
        'No lo dejes para después: invertir en ti es sentirte valorada 💜 Tu {servicio} te está esperando.',
        'Libérate del estrés un rato y ven por ese look que ya elegiste ✨',
        'Imagina despertar con tu mirada lista cada día — estás a un paso con tu {servicio}.',
        'No es solo pestañas: es un espacio donde te sentimos valorada. Elige el día que te acomode 💜'
      )
    ),
    true,
    30,
    now()
  ),
  (
    gen_random_uuid(),
    'zm-lash-nails',
    'emotional_almost_close_lines_lift',
    'Casi cierra — frases Lifting (CTWA)',
    'campanas',
    jsonb_build_object(
      'lines',
      jsonb_build_array(
        'Tu mirada puede lucir espectacular sin maquillaje diario ✨ Solo falta elegir el día que te acomode.',
        'Invertir en ti es sentirte valorada 💜 Tu {servicio} te está esperando en el salón.',
        'Date ese momento para ti — el lifting que elegiste puede cambiar tu rutina ✨',
        'No lo dejes para después: esa mirada despierta que buscas está a un paso 💜',
        'Libérate del estrés un rato y ven por el look que ya tienes en tu selección ✨'
      )
    ),
    true,
    31,
    now()
  ),
  (
    gen_random_uuid(),
    'zm-lash-nails',
    'emotional_decline_reply_ctwa',
    'Despedida cálida si duda (CTWA Ext/Lift)',
    'campanas',
    jsonb_build_object(
      'text',
      '¡Por supuesto! 💜 Tómate tu tiempo — cuando quieras retomar, escribe *agendar* y te ayudamos con gusto. ¡Que tengas un lindo día! 🌸'
    ),
    true,
    32,
    now()
  ),
  (
    gen_random_uuid(),
    'zm-lash-nails',
    'emotional_nudge2_reply_ctwa',
    'Nudge 2 suave — carrito abandonado (CTWA Ext/Lift)',
    'campanas',
    jsonb_build_object(
      'text',
      'Sin presión 💜 Si más adelante quieres retomar tu cita, escribe *agendar* y te pasamos al calendario en segundos.'
    ),
    true,
    33,
    now()
  ),
  (
    gen_random_uuid(),
    'zm-lash-nails',
    'emotional_price_cta_ext',
    'Caption foto proactiva — precio CTWA Extensiones',
    'campanas',
    jsonb_build_object(
      'text',
      'Así puede quedar {parte} con {servicio} ✨\nEsa mirada que buscas puede ser tuya — ¿te agendo cuando te animes? 💜'
    ),
    true,
    34,
    now()
  ),
  (
    gen_random_uuid(),
    'zm-lash-nails',
    'haiku_emotional_selling_ctwa_ext_lift',
    'Prompt Haiku — venta emocional CTWA Ext/Lift',
    'campanas',
    jsonb_build_object(
      'text',
      'VENTA EMOCIONAL CTWA (Extensiones / Lifting) — solo si la clienta llegó por anuncio Meta:\n- Tono: metáfora suave (valoración, invertir en ti, merecer verte bien). PROHIBIDO rol de psicóloga/terapeuta ni claims médicos.\n- Máx 2 burbujas cortas; siempre anclar a un paso concreto (show_category, add_to_cart, calendario). Nunca inventar precios.\n- Precio genérico pestañas: valida el deseo + beneficio emocional breve antes de la lista.\n- Carrito armado / casi agenda: nombra el servicio elegido + invitación suave a elegir día.\n- Hesitación ("lo pienso", "gracias por la info"): empatía + puerta abierta; NO menú agresivo ni presión.'
    ),
    true,
    35,
    now()
  )
ON CONFLICT (tenant_id, config_key) DO NOTHING;
