-- Plan 19 — Crear una cita y sus líneas en una sola transacción.
-- Antes: insert en appointments + insert en appointment_services desde el cliente,
-- con borrado manual si el segundo fallaba. SECURITY INVOKER: aplican las mismas
-- políticas RLS que los inserts directos (rol y tenant).
CREATE OR REPLACE FUNCTION public.create_appointment_with_services(
  p_appointment jsonb,
  p_services jsonb
) RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $f$
DECLARE
  v_tenant text := p_appointment ->> 'tenant_id';
  v_id text;
BEGIN
  IF v_tenant IS NULL OR v_tenant = '' THEN
    RAISE EXCEPTION 'No se pudo resolver el tenant';
  END IF;
  IF p_services IS NULL OR jsonb_typeof(p_services) <> 'array' OR jsonb_array_length(p_services) = 0 THEN
    RAISE EXCEPTION 'Selecciona al menos un servicio';
  END IF;

  INSERT INTO public.appointments (
    tenant_id, client_id, client_name, client_phone, client_document,
    service_id, employee_id, service_ids, date, duration, price, status
  ) VALUES (
    v_tenant,
    NULLIF(p_appointment ->> 'client_id', ''),
    p_appointment ->> 'client_name',
    p_appointment ->> 'client_phone',
    p_appointment ->> 'client_document',
    p_appointment ->> 'service_id',
    NULLIF(p_appointment ->> 'employee_id', ''),
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(p_appointment -> 'service_ids')),
      '{}'::text[]
    ),
    (p_appointment ->> 'date')::timestamp,
    (p_appointment ->> 'duration')::integer,
    (p_appointment ->> 'price')::numeric,
    COALESCE(NULLIF(p_appointment ->> 'status', ''), 'scheduled')
  )
  RETURNING id INTO v_id;

  INSERT INTO public.appointment_services (
    appointment_id, service_id, employee_id, pack_id, price, duration, tenant_id
  )
  SELECT
    v_id,
    s ->> 'service_id',
    NULLIF(s ->> 'employee_id', ''),
    NULLIF(s ->> 'pack_id', ''),
    COALESCE((s ->> 'price')::numeric, 0),
    COALESCE((s ->> 'duration')::integer, 0),
    v_tenant
  FROM jsonb_array_elements(p_services) AS s;

  RETURN v_id;
END;
$f$;

REVOKE ALL ON FUNCTION public.create_appointment_with_services(jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_appointment_with_services(jsonb, jsonb)
  TO authenticated, service_role;
