-- Espaciado entre párrafos del copy de adelanto (pedido de Vanessa, 6-oct-2026). Mismo contenido, un párrafo por idea.
UPDATE public.waba_config
SET config_value = jsonb_build_object(
      'text',
      E'\n*Adelanto para reservar tu cupo* ✨\n\nRealiza un adelanto de S/{monto} vía Yape o Plin al:\n\n📲 932 535 512\nZM Lash and Nails Beauty\n\nCuando pagues, mándanos el print de pantalla para confirmar tu cita 💜\n\n*Importante:*\n\n⏰ Tolerancia el día de tu cita: {tolerancia} minutos.\n\n📅 Si por algún motivo ya no puedes venir, avísanos con anticipación.\n\nDetrás de cada cita hay otra personita esperando un espacio.\n\n⚠️ *El adelanto no es reembolsable* si cancelas, no asistes o tienes un imprevisto.\n\nPuedes reprogramar *una sola vez*, avisando con mínimo 24 horas de anticipación y sujeto a disponibilidad; tu adelanto se mantiene a tu favor.\n\nSi somos nosotras quienes no podemos atenderte, reprogramamos sin costo o te reembolsamos el adelanto.\n\n📝 Al enviar tu pago aceptas estas condiciones: zmlashnails.com/terminos-y-condiciones\n\n¡Gracias por confiar en ZM Lash and Nails Beauty! 🌸✨\n'
    ),
    updated_at = now()
WHERE config_key = 'deposit_fixed_instructions_text' AND tenant_id = 'zm-lash-nails';
