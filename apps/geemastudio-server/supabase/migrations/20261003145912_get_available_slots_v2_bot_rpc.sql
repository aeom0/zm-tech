-- Plan 18 — Motor v2: elegibilidad reutilizable, citas sin asignar por servicio y RPC para el bot.

-- ¿La profesional puede hacer ese servicio ese día? (propio o heredado por cobertura)
CREATE OR REPLACE FUNCTION public.employee_eligible_for_service(
  p_tenant_id text, p_employee_id text, p_service_id text, p_day date
) RETURNS boolean
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $f$
  SELECT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = p_employee_id AND e.tenant_id = p_tenant_id AND e.is_active
      AND (
        e.does_all_services
        OR EXISTS (SELECT 1 FROM public.employee_services es
                   WHERE es.employee_id = e.id AND es.service_id = p_service_id)
        OR EXISTS (SELECT 1
                   FROM public.employee_coverages c
                   JOIN public.employees ce ON ce.id = c.covered_employee_id
                   WHERE c.tenant_id = p_tenant_id
                     AND c.covering_employee_id = e.id
                     AND p_day BETWEEN c.date_from AND c.date_to
                     AND (ce.does_all_services
                          OR EXISTS (SELECT 1 FROM public.employee_services es2
                                     WHERE es2.employee_id = ce.id AND es2.service_id = p_service_id)))
      )
  );
$f$;

REVOKE ALL ON FUNCTION public.employee_eligible_for_service(text, text, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.employee_eligible_for_service(text, text, text, date)
  TO authenticated, service_role;

-- Plan 18 — Fase 2: motor de disponibilidad por profesional.
-- get_available_slots devuelve los horarios de inicio posibles para un carrito de servicios
-- (en orden) y, para cada uno, la asignación de profesional por servicio.
--
-- Reglas:
--  * Día abierto según tenant_settings.business_hours; salon_holidays (is_closed / open_until_hour).
--  * Inicios cada p_step_minutes desde open hasta close (exclusivo). En feriado con open_until_hour,
--    el último inicio es esa hora (inclusive).
--  * Elegible por servicio: employees.does_all_services o fila en employee_services, o cubre ese día
--    a una elegible (employee_coverages).
--  * No disponible: ausencia (employee_time_off), cubierta por otra ese día, fuera de su horario
--    (employee_work_hours; sin filas = hereda el del negocio) o con otra cita solapada.
--  * Citas sin profesional (ni en appointments ni en appointment_services) consumen a una candidata
--    elegible para alguno de sus servicios, por cada cita solapada.
--  * Multi-servicio: segmentos consecutivos, un profesional por segmento; se prefiere mantener al
--    mismo profesional del servicio anterior.
-- Hora local del tenant en todo momento (appointments.date es timestamp sin zona).

CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_tenant_id    text,
  p_service_ids  text[],
  p_from         date,
  p_to           date,
  p_step_minutes integer DEFAULT 60,
  p_now          timestamp DEFAULT NULL
)
RETURNS TABLE (slot_start timestamp, assignments jsonb)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $fn$
DECLARE
  v_days       text[] := ARRAY['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
  v_tz         text;
  v_hours      jsonb;
  v_now        timestamp;
  v_ids        text[];
  v_durs       integer[];
  v_n          integer;
  v_day        date;
  v_dow        integer;
  v_day_cfg    jsonb;
  v_open       time;
  v_close      time;
  v_closed     boolean;
  v_open_until smallint;
  v_slot       timestamp;
  v_cum        integer;
  v_seg_start  timestamp;
  v_seg_end    timestamp;
  v_prev       text;
  v_cands      text[];
  v_u_id       varchar;
  v_u_services text[];
  v_pick       text;
  k            integer;
  v_assign     jsonb;
  v_ok         boolean;
  i            integer;
BEGIN
  IF p_step_minutes IS NULL OR p_step_minutes < 5 THEN
    RAISE EXCEPTION 'p_step_minutes invalido';
  END IF;
  IF p_to < p_from OR p_to - p_from > 30 THEN
    RAISE EXCEPTION 'rango de fechas invalido (maximo 31 dias)';
  END IF;
  IF p_service_ids IS NULL OR cardinality(p_service_ids) = 0 THEN
    RETURN;
  END IF;

  SELECT ts.timezone, ts.business_hours
    INTO v_tz, v_hours
  FROM public.tenant_settings ts
  WHERE ts.tenant_slug = p_tenant_id
  LIMIT 1;
  IF NOT FOUND OR v_hours IS NULL THEN
    RETURN;
  END IF;

  v_now := COALESCE(p_now, now() AT TIME ZONE v_tz);

  SELECT array_agg(s.id ORDER BY o.ord), array_agg(s.duration ORDER BY o.ord)
    INTO v_ids, v_durs
  FROM unnest(p_service_ids) WITH ORDINALITY AS o(sid, ord)
  JOIN public.services s
    ON s.id = o.sid AND s.tenant_id = p_tenant_id AND s.is_active;
  v_n := COALESCE(cardinality(v_ids), 0);
  IF v_n <> cardinality(p_service_ids) THEN
    RETURN;  -- algun servicio no existe o esta inactivo
  END IF;

  FOR v_day IN SELECT d::date FROM generate_series(p_from, p_to, interval '1 day') AS d LOOP
    v_dow := extract(dow FROM v_day)::integer;
    v_day_cfg := v_hours -> v_days[v_dow + 1];
    IF v_day_cfg IS NULL OR v_day_cfg ->> 'open' IS NULL OR v_day_cfg ->> 'close' IS NULL THEN
      CONTINUE;
    END IF;
    v_open  := (v_day_cfg ->> 'open')::time;
    v_close := (v_day_cfg ->> 'close')::time;

    v_closed := false;
    v_open_until := NULL;
    SELECT h.is_closed, h.open_until_hour
      INTO v_closed, v_open_until
    FROM public.salon_holidays h
    WHERE h.tenant_id = p_tenant_id AND h.date = v_day;
    IF COALESCE(v_closed, false) THEN
      CONTINUE;
    END IF;

    FOR v_slot IN
      SELECT g
      FROM generate_series(v_day + v_open, v_day + v_close - interval '1 minute',
                           make_interval(mins => p_step_minutes)) AS g
      WHERE g > v_now
        AND (v_open_until IS NULL OR g::time <= make_time(v_open_until, 0, 0))
    LOOP
      v_cum := 0;
      v_prev := NULL;
      v_assign := '[]'::jsonb;
      v_ok := true;

      FOR i IN 1..v_n LOOP
        v_seg_start := v_slot + make_interval(mins => v_cum);
        v_seg_end   := v_seg_start + make_interval(mins => v_durs[i]);

        SELECT COALESCE(array_agg(e.id ORDER BY COALESCE(e.id = v_prev, false) DESC, e.name, e.id), '{}')
          INTO v_cands
        FROM public.employees e
        WHERE e.tenant_id = p_tenant_id
          AND e.is_active
          -- elegible por servicio, propio o heredado por cobertura
          AND (
            e.does_all_services
            OR EXISTS (SELECT 1 FROM public.employee_services es
                       WHERE es.employee_id = e.id AND es.service_id = v_ids[i])
            OR EXISTS (SELECT 1
                       FROM public.employee_coverages c
                       JOIN public.employees ce ON ce.id = c.covered_employee_id
                       WHERE c.tenant_id = p_tenant_id
                         AND c.covering_employee_id = e.id
                         AND v_day BETWEEN c.date_from AND c.date_to
                         AND (ce.does_all_services
                              OR EXISTS (SELECT 1 FROM public.employee_services es2
                                         WHERE es2.employee_id = ce.id AND es2.service_id = v_ids[i])))
          )
          -- cubierta por otra ese dia = ausente
          AND NOT EXISTS (SELECT 1 FROM public.employee_coverages c
                          WHERE c.tenant_id = p_tenant_id
                            AND c.covered_employee_id = e.id
                            AND v_day BETWEEN c.date_from AND c.date_to)
          -- ausencias
          AND NOT EXISTS (SELECT 1 FROM public.employee_time_off t
                          WHERE t.tenant_id = p_tenant_id
                            AND t.employee_id = e.id
                            AND v_day >= t.date_from
                            AND (t.date_to IS NULL OR v_day <= t.date_to)
                            AND (t.start_time IS NULL
                                 OR (v_seg_start::time < t.end_time AND v_seg_end::time > t.start_time)))
          -- horario propio (sin filas = hereda el del negocio)
          AND (
            NOT EXISTS (SELECT 1 FROM public.employee_work_hours w WHERE w.employee_id = e.id)
            OR EXISTS (SELECT 1 FROM public.employee_work_hours w
                       WHERE w.employee_id = e.id
                         AND w.weekday = v_dow
                         AND w.start_time <= v_seg_start::time
                         AND w.end_time >= v_seg_end::time)
          )
          -- sin cita solapada
          AND NOT EXISTS (
            SELECT 1 FROM public.appointments a
            WHERE a.tenant_id = p_tenant_id
              AND a.status <> 'cancelled'
              AND a.date < v_seg_end
              AND a.date + make_interval(mins => COALESCE(a.duration, 0)) > v_seg_start
              AND (a.employee_id = e.id
                   OR EXISTS (SELECT 1 FROM public.appointment_services s
                              WHERE s.appointment_id = a.id AND s.employee_id = e.id))
          );

        -- Citas sin profesional: cada una consume a una candidata elegible para alguno de sus
        -- servicios (la menos preferida, para conservar a la del servicio anterior). Una cita de
        -- Stephani sin asignar no le quita cupo a Karelis para otro servicio.
        IF cardinality(v_cands) > 0 THEN
          FOR v_u_id, v_u_services IN
            SELECT a.id,
                   COALESCE(
                     NULLIF((SELECT array_agg(s.service_id::text) FROM public.appointment_services s
                             WHERE s.appointment_id = a.id), '{}'::text[]),
                     NULLIF(a.service_ids::text[], '{}'::text[]),
                     CASE WHEN a.service_id IS NOT NULL THEN ARRAY[a.service_id::text] END
                   )
            FROM public.appointments a
            WHERE a.tenant_id = p_tenant_id
              AND a.status <> 'cancelled'
              AND a.employee_id IS NULL
              AND a.date < v_seg_end
              AND a.date + make_interval(mins => COALESCE(a.duration, 0)) > v_seg_start
              AND NOT EXISTS (SELECT 1 FROM public.appointment_services s
                              WHERE s.appointment_id = a.id AND s.employee_id IS NOT NULL)
            ORDER BY a.date, a.id
          LOOP
            EXIT WHEN cardinality(v_cands) = 0;
            v_pick := NULL;
            FOR k IN REVERSE cardinality(v_cands)..1 LOOP
              IF v_u_services IS NULL
                 OR EXISTS (SELECT 1 FROM unnest(v_u_services) AS us(sid)
                            WHERE public.employee_eligible_for_service(p_tenant_id, v_cands[k], us.sid, v_day)) THEN
                v_pick := v_cands[k];
                EXIT;
              END IF;
            END LOOP;
            IF v_pick IS NOT NULL THEN
              v_cands := array_remove(v_cands, v_pick);
            END IF;
          END LOOP;
        END IF;

        IF cardinality(v_cands) = 0 THEN
          v_ok := false;
          EXIT;
        END IF;

        v_prev := v_cands[1];
        v_assign := v_assign || jsonb_build_array(jsonb_build_object(
          'service_id',  v_ids[i],
          'employee_id', v_prev,
          'starts_at',   to_char(v_seg_start, 'YYYY-MM-DD"T"HH24:MI:SS'),
          'duration',    v_durs[i]
        ));
        v_cum := v_cum + v_durs[i];
      END LOOP;

      IF v_ok THEN
        slot_start := v_slot;
        assignments := v_assign;
        RETURN NEXT;
      END IF;
    END LOOP;
  END LOOP;
END;
$fn$;

REVOKE ALL ON FUNCTION public.get_available_slots(text, text[], date, date, integer, timestamp) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_available_slots(text, text[], date, date, integer, timestamp)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.get_available_slots(text, text[], date, date, integer, timestamp) IS
  'Plan 18: horarios disponibles por carrito de servicios con asignacion de profesional por servicio.';

-- RPC para el bot WABA (service_role): horarios de un día con paso corto y bandera "configurado".
-- configured = false cuando el negocio no usa ninguna regla de disponibilidad por profesional;
-- en ese caso el bot conserva su lógica actual y no consulta el motor.
CREATE OR REPLACE FUNCTION public.get_day_slots_for_bot(
  p_tenant_id    text,
  p_service_ids  text[],
  p_day          date,
  p_step_minutes integer DEFAULT 15,
  p_now          timestamp DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $b$
DECLARE
  v_configured boolean;
  v_slots jsonb;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.employees e WHERE e.tenant_id = p_tenant_id AND NOT e.does_all_services)
      OR EXISTS (SELECT 1 FROM public.employee_work_hours w WHERE w.tenant_id = p_tenant_id)
      OR EXISTS (SELECT 1 FROM public.employee_time_off t WHERE t.tenant_id = p_tenant_id)
      OR EXISTS (SELECT 1 FROM public.employee_coverages c WHERE c.tenant_id = p_tenant_id)
    INTO v_configured;

  IF NOT v_configured THEN
    RETURN jsonb_build_object('configured', false, 'slots', '[]'::jsonb);
  END IF;

  SELECT COALESCE(jsonb_agg(to_char(s.slot_start, 'HH24:MI') ORDER BY s.slot_start), '[]'::jsonb)
    INTO v_slots
  FROM public.get_available_slots(p_tenant_id, p_service_ids, p_day, p_day, p_step_minutes, p_now) s;

  RETURN jsonb_build_object('configured', true, 'slots', v_slots);
END;
$b$;

REVOKE ALL ON FUNCTION public.get_day_slots_for_bot(text, text[], date, integer, timestamp) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_day_slots_for_bot(text, text[], date, integer, timestamp) TO service_role;
