-- Salvedad de falla del salón + enlace a T&C en el copy del adelanto (revisión Indecopi, 5-oct-2026).
-- Reemplaza "en ningún caso" por la regla acotada a cancelación/inasistencia de la clienta.
UPDATE public.waba_config
SET config_value = jsonb_build_object(
      'text',
      E'\n*Adelanto para reservar tu cupo* ✨\n\nRealiza un adelanto de S/{monto} vía Yape o Plin al:\n\n📲 932 535 512\nZM Lash and Nails Beauty\n\nCuando pagues, mándanos el print de pantalla para confirmar tu cita 💜\n\n*Importante:*\n⏰ Tolerancia el día de tu cita: {tolerancia} minutos.\n📅 Si por algún motivo ya no puedes venir, avísanos con anticipación. Detrás de cada cita hay otra personita esperando un espacio.\n⚠️ *El adelanto no es reembolsable* si cancelas, no asistes o tienes un imprevisto. Puedes reprogramar *una sola vez*, avisando con mínimo 24 horas de anticipación y sujeto a disponibilidad; tu adelanto se mantiene a tu favor. Si somos nosotras quienes no podemos atenderte, reprogramamos sin costo o te reembolsamos el adelanto.\n📝 Al enviar tu pago aceptas estas condiciones: zmlashnails.com/terminos-y-condiciones\n\n¡Gracias por confiar en ZM Lash and Nails Beauty! 🌸✨\n'
    ),
    updated_at = now()
WHERE config_key = 'deposit_fixed_instructions_text';
