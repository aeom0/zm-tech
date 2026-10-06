-- Endurece el copy del adelanto (caso Luciana Eléspuru, 4-oct-2026): no reembolsable en ningún caso,
-- reprogramación única con 24 h de aviso, aceptación al pagar. Sin la palabra "devolución".
UPDATE public.waba_config
SET config_value = jsonb_build_object(
      'text',
      E'\n*Adelanto para reservar tu cupo* ✨\n\nRealiza un adelanto de S/{monto} vía Yape o Plin al:\n\n📲 932 535 512\nZM Lash and Nails Beauty\n\nCuando pagues, mándanos el print de pantalla para confirmar tu cita 💜\n\n*Importante:*\n⏰ Tolerancia el día de tu cita: {tolerancia} minutos.\n📅 Si por algún motivo ya no puedes venir, avísanos con anticipación. Detrás de cada cita hay otra personita esperando un espacio.\n⚠️ *El adelanto no es reembolsable* en ningún caso (cancelación, inasistencia o imprevisto). Solo puedes reprogramar *una sola vez*, avisando con mínimo 24 horas de anticipación y sujeto a disponibilidad; tu adelanto se mantiene a tu favor.\n📝 Al enviar tu pago aceptas estas condiciones.\n\n¡Gracias por confiar en ZM Lash and Nails Beauty! 🌸✨\n'
    ),
    updated_at = now()
WHERE config_key = 'deposit_fixed_instructions_text';
