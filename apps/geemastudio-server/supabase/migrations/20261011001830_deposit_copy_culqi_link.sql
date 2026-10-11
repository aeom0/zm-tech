-- Link de pago Culqi (tarjeta, S/26.25 = S/25 + 5%) como alternativa a Yape/Plin en el adelanto fijo de ZM Lash (10-oct-2026).
UPDATE public.waba_config
SET config_value = jsonb_set(
      config_value,
      '{text}',
      to_jsonb(replace(
        config_value->>'text',
        E'ZM Lash and Nails Beauty\n\nCuando pagues, mándanos el print de pantalla para confirmar tu cita 💜',
        E'ZM Lash and Nails Beauty\n\n💳 O paga con tarjeta (S/26.25, incluye 5% de comisión por pago en línea) desde este link, eliges cómo pagar y listo:\nhttps://express.culqi.com/pago/D4DCC2B31B\n\nCuando pagues, mándanos el print de pantalla o el comprobante para confirmar tu cita 💜'
      ))
    ),
    updated_at = now()
WHERE config_key = 'deposit_fixed_instructions_text'
  AND tenant_id = 'zm-lash-nails'
  AND config_value->>'text' NOT LIKE '%culqi.com%';
