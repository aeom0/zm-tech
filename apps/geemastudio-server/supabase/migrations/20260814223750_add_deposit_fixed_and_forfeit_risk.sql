-- Abono fijo S/25 (clientas nuevas / no-show) + marca sin reembolso <24h
ALTER TABLE public.whatsapp_sessions
  ADD COLUMN IF NOT EXISTS deposit_mode text;

COMMENT ON COLUMN public.whatsapp_sessions.deposit_mode IS
  'fixed = abono S/25 historial; rate = % fecha (domingo/feriado); null = sin abono';

ALTER TABLE public.appointment_verifications
  ADD COLUMN IF NOT EXISTS deposit_forfeit_risk boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.appointment_verifications.deposit_forfeit_risk IS
  'true si canceló/reagendó con <24h y ya había comprobante (payment_submitted|approved)';

INSERT INTO public.waba_config (config_key, label, category, config_value, is_active, sort_order, tenant_id)
VALUES
  (
    'deposit_fixed_instructions_text',
    'Instrucciones abono fijo (nuevas / no-show)',
    'mensajes',
    jsonb_build_object(
      'text',
      E'💜 *Para confirmar tu cita necesitamos un adelanto de S/ {monto}*

Este adelanto reserva tu espacio y se descuenta del total el día de tu cita.

📲 *Medios de pago:*
• Yape / Plin: 932 535 512
• Nombre: Vanessa / ZM Lash & Nails

Luego envíame en un solo mensaje:
1️⃣ Foto del voucher o captura del comprobante
2️⃣ Nombre completo, número de DNI o CE y teléfono

⏰ Tolerancia de llegada: *hasta {tolerancia} minutos*. Si llegas después, la cita podría reprogramarse según disponibilidad.

❌ Si cancelas o reprogramas con menos de *24 horas* de anticipación, el adelanto *no se devuelve*.

_Si te equivocaste o quieres cambiar algo, escribe_ *Cancelar* _para volver a empezar._'
    ),
    true,
    40,
    'zm-lash-nails'
  ),
  (
    'deposit_fixed_amount',
    'Monto abono fijo (S/)',
    'mensajes',
    jsonb_build_object('amount', 25),
    true,
    41,
    'zm-lash-nails'
  ),
  (
    'deposit_fixed_tolerance_minutes',
    'Tolerancia llegada abono fijo (min)',
    'mensajes',
    jsonb_build_object('minutes', 5),
    true,
    42,
    'zm-lash-nails'
  )
ON CONFLICT (config_key) DO NOTHING;

