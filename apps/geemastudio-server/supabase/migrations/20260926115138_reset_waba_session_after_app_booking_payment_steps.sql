CREATE OR REPLACE FUNCTION public.reset_waba_session_after_app_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  phones text[];
  wa_phone text;
BEGIN
  IF NEW.source = 'whatsapp' THEN
    RETURN NEW;
  END IF;

  IF NEW.client_phone IS NULL OR trim(NEW.client_phone) = '' THEN
    RETURN NEW;
  END IF;

  phones := public.wa_phone_variants(NEW.client_phone);

  FOREACH wa_phone IN ARRAY phones LOOP
    UPDATE public.whatsapp_sessions
    SET
      step = 'browsing',
      cart_items = '[]',
      cart_service_ids = '[]',
      parsed_datetime = NULL,
      employee_assignments = '{}',
      reschedule_appointment_id = NULL,
      awaiting_screenshot = false,
      updated_at = NOW()
    WHERE phone = wa_phone
      AND step IN (
        'awaiting_datetime',
        'awaiting_deposit_datos',
        'awaiting_deposit_boleta',
        'awaiting_payment_info',
        'awaiting_payment_screenshot'
      );
  END LOOP;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.reset_waba_session_after_app_booking() IS
  'P3-B: resetea whatsapp_sessions en awaiting_datetime y pasos de depósito/pago cuando se crea cita por app (no source=whatsapp).';
