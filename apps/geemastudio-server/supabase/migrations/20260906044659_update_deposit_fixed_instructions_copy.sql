UPDATE public.waba_config
SET config_value = jsonb_build_object(
      'text',
      E'\n*Adelanto para reservar tu cupo* ✨\n\nRealiza un adelanto de S/{monto} vía Yape o Plin al:\n\n📲 932 535 512\nZM Lash and Nails Beauty\n\nCuando pagues, mándanos el print de pantalla para confirmar tu cita 💜\n\n*Importante:*\n⏰ Tolerancia el día de tu cita: {tolerancia} minutos.\n📅 Si por algún motivo ya no puedes venir, avísanos con anticipación. Detrás de cada cita hay otra personita esperando un espacio.\n⚠️ No habrá devolución del adelanto, solo re-programación dentro de las 24 horas siguientes, sujeto a disponibilidad.\n\n¡Gracias por confiar en ZM Lash and Nails Beauty! 🌸✨\n'
    ),
    updated_at = now()
WHERE config_key = 'deposit_fixed_instructions_text';
