-- Profesionales libres a la misma hora para un servicio (pack de 2 personas).
-- Descuenta citas sin profesional: el motor de cupos las asigna a alguien libre.

CREATE OR REPLACE FUNCTION public.free_pros_for_service(
  p_tenant_id text,
  p_service_id text,
  p_start timestamp without time zone,
  p_end timestamp without time zone
) RETURNS text[]
LANGUAGE plpgsql
STABLE
SET search_path TO public
AS $$
DECLARE
  v_ids text[];
  v_held integer;
BEGIN
  IF p_end <= p_start THEN
    RETURN '{}'::text[];
  END IF;

  SELECT COALESCE(array_agg(e.id ORDER BY e.name, e.id), '{}'::text[])
    INTO v_ids
  FROM public.employees e
  WHERE e.tenant_id = p_tenant_id
    AND e.is_active
    AND public.employee_eligible_for_service(p_tenant_id, e.id, p_service_id, p_start::date)
    AND public.employee_is_free(p_tenant_id, e.id, p_start, p_end, NULL);

  SELECT count(*)::integer INTO v_held
  FROM public.appointments a
  WHERE a.tenant_id = p_tenant_id
    AND a.status <> 'cancelled'
    AND a.employee_id IS NULL
    AND a.date < p_end
    AND a.date + make_interval(mins => COALESCE(a.duration, 0)) > p_start
    AND NOT EXISTS (
      SELECT 1 FROM public.appointment_services s
      WHERE s.appointment_id = a.id AND s.employee_id IS NOT NULL
    );

  IF v_held >= COALESCE(cardinality(v_ids), 0) THEN
    RETURN '{}'::text[];
  END IF;
  IF v_held > 0 THEN
    v_ids := v_ids[(v_held + 1):cardinality(v_ids)];
  END IF;
  RETURN COALESCE(v_ids, '{}'::text[]);
END;
$$;

GRANT EXECUTE ON FUNCTION public.free_pros_for_service(text, text, timestamp without time zone, timestamp without time zone) TO service_role, authenticated;
