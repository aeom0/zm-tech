-- La validación de turnos solapados no se podía ejecutar:
-- WITH ORDINALITY no admite la lista de columnas de jsonb_to_recordset.

CREATE OR REPLACE FUNCTION public.save_employee_work_hours(
  p_employee_id text,
  p_shifts jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $h$
DECLARE
  v_tenant text := public.current_tenant_id();
  v_shifts jsonb := COALESCE(p_shifts, '[]'::jsonb);
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'No tienes permiso para editar la disponibilidad';
  END IF;
  IF v_tenant IS NULL OR v_tenant = '' THEN
    RAISE EXCEPTION 'No se pudo identificar el negocio';
  END IF;
  IF jsonb_typeof(v_shifts) <> 'array' THEN
    RAISE EXCEPTION 'El horario no tiene el formato esperado';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = p_employee_id AND e.tenant_id = v_tenant
  ) THEN
    RAISE EXCEPTION 'No se encontró el profesional';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(v_shifts) AS x(weekday int, start_time time, end_time time)
    WHERE weekday IS NULL
       OR weekday < 0 OR weekday > 6
       OR start_time IS NULL OR end_time IS NULL
       OR end_time <= start_time
  ) THEN
    RAISE EXCEPTION 'Revisa los turnos: cada uno necesita un día y una hora de fin posterior al inicio';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_shifts) WITH ORDINALITY AS a(elem, ord)
    JOIN jsonb_array_elements(v_shifts) WITH ORDINALITY AS b(elem, ord)
      ON (a.elem->>'weekday')::int = (b.elem->>'weekday')::int
     AND a.ord < b.ord
     AND (a.elem->>'start_time')::time < (b.elem->>'end_time')::time
     AND (b.elem->>'start_time')::time < (a.elem->>'end_time')::time
  ) THEN
    RAISE EXCEPTION 'Los turnos de un mismo día se solapan';
  END IF;

  DELETE FROM public.employee_work_hours
   WHERE employee_id = p_employee_id AND tenant_id = v_tenant;

  INSERT INTO public.employee_work_hours (tenant_id, employee_id, weekday, start_time, end_time)
  SELECT v_tenant, p_employee_id, x.weekday, x.start_time, x.end_time
  FROM jsonb_to_recordset(v_shifts) AS x(weekday int, start_time time, end_time time);
END;
$h$;

REVOKE ALL ON FUNCTION public.save_employee_work_hours(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_employee_work_hours(text, jsonb)
  TO authenticated, service_role;
