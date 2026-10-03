-- Plan 18 — Correcciones del motor y guardados atómicos.
-- 1. Una cita sin profesional la cubre quien pueda (aunque no haga el servicio nuevo).
--    Solo se le quita el cupo a una candidata del servicio nuevo si nadie más puede cubrirla.
-- 2. employee_services y employee_work_hours se filtran por tenant (service_role no usa RLS).
-- 3. Guardar servicios u horario es una sola transacción.

-- Libre en un rango (hora local del tenant): no cubierta, sin ausencia, dentro de su horario
-- y sin otra cita ya asignada. No mira elegibilidad por servicio.
CREATE OR REPLACE FUNCTION public.employee_is_free(
  p_tenant_id text,
  p_employee_id text,
  p_start timestamp,
  p_end timestamp
) RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $f$
  SELECT p_end > p_start AND EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.id = p_employee_id
      AND e.tenant_id = p_tenant_id
      AND e.is_active
      AND NOT EXISTS (
        SELECT 1 FROM public.employee_coverages c
        WHERE c.tenant_id = p_tenant_id
          AND c.covered_employee_id = e.id
          AND p_start::date BETWEEN c.date_from AND c.date_to
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.employee_time_off t
        WHERE t.tenant_id = p_tenant_id
          AND t.employee_id = e.id
          AND p_start::date >= t.date_from
          AND (t.date_to IS NULL OR p_start::date <= t.date_to)
          AND (
            t.start_time IS NULL
            OR (p_start::time < t.end_time AND p_end::time > t.start_time)
          )
      )
      AND (
        NOT EXISTS (
          SELECT 1 FROM public.employee_work_hours w
          WHERE w.tenant_id = p_tenant_id AND w.employee_id = e.id
        )
        OR EXISTS (
          SELECT 1 FROM public.employee_work_hours w
          WHERE w.tenant_id = p_tenant_id
            AND w.employee_id = e.id
            AND w.weekday = extract(dow FROM p_start)::integer
            AND w.start_time <= p_start::time
            AND w.end_time >= p_end::time
        )
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.appointments a
        WHERE a.tenant_id = p_tenant_id
          AND a.status <> 'cancelled'
          AND a.date < p_end
          AND a.date + make_interval(mins => COALESCE(a.duration, 0)) > p_start
          AND (
            a.employee_id = e.id
            OR EXISTS (
              SELECT 1 FROM public.appointment_services s
              WHERE s.appointment_id = a.id AND s.employee_id = e.id
            )
          )
      )
  );
$f$;

REVOKE ALL ON FUNCTION public.employee_is_free(text, text, timestamp, timestamp) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.employee_is_free(text, text, timestamp, timestamp)
  TO authenticated, service_role;

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
        OR EXISTS (
          SELECT 1 FROM public.employee_services es
          WHERE es.tenant_id = p_tenant_id
            AND es.employee_id = e.id
            AND es.service_id = p_service_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.employee_coverages c
          JOIN public.employees ce
            ON ce.id = c.covered_employee_id AND ce.tenant_id = p_tenant_id
          WHERE c.tenant_id = p_tenant_id
            AND c.covering_employee_id = e.id
            AND p_day BETWEEN c.date_from AND c.date_to
            AND (
              ce.does_all_services
              OR EXISTS (
                SELECT 1 FROM public.employee_services es2
                WHERE es2.tenant_id = p_tenant_id
                  AND es2.employee_id = ce.id
                  AND es2.service_id = p_service_id
              )
            )
        )
      )
  );
$f$;

REVOKE ALL ON FUNCTION public.employee_eligible_for_service(text, text, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.employee_eligible_for_service(text, text, text, date)
  TO authenticated, service_role;

-- Motor v2 corregido. Misma firma que 20261003145912.
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
  v_held       jsonb := '[]'::jsonb;
  v_u_id       varchar;
  v_u_services text[];
  v_u_start    timestamp;
  v_u_end      timestamp;
  v_pick       text;
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
    RETURN;
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
      v_held := '[]'::jsonb;
      v_ok := true;

      FOR i IN 1..v_n LOOP
        v_seg_start := v_slot + make_interval(mins => v_cum);
        v_seg_end   := v_seg_start + make_interval(mins => v_durs[i]);

        SELECT COALESCE(array_agg(e.id ORDER BY COALESCE(e.id = v_prev, false) DESC, e.name, e.id), '{}')
          INTO v_cands
        FROM public.employees e
        WHERE e.tenant_id = p_tenant_id
          AND e.is_active
          AND (
            e.does_all_services
            OR EXISTS (
              SELECT 1 FROM public.employee_services es
              WHERE es.tenant_id = p_tenant_id
                AND es.employee_id = e.id
                AND es.service_id = v_ids[i]
            )
            OR EXISTS (
              SELECT 1
              FROM public.employee_coverages c
              JOIN public.employees ce
                ON ce.id = c.covered_employee_id AND ce.tenant_id = p_tenant_id
              WHERE c.tenant_id = p_tenant_id
                AND c.covering_employee_id = e.id
                AND v_day BETWEEN c.date_from AND c.date_to
                AND (
                  ce.does_all_services
                  OR EXISTS (
                    SELECT 1 FROM public.employee_services es2
                    WHERE es2.tenant_id = p_tenant_id
                      AND es2.employee_id = ce.id
                      AND es2.service_id = v_ids[i]
                  )
                )
            )
          )
          AND public.employee_is_free(p_tenant_id, e.id, v_seg_start, v_seg_end)
          -- Ya comprometida en este carrito (segmento anterior solapado).
          AND NOT EXISTS (
            SELECT 1 FROM jsonb_array_elements(v_assign) AS prev
            WHERE prev->>'employee_id' = e.id
              AND (prev->>'starts_at')::timestamp < v_seg_end
              AND (prev->>'starts_at')::timestamp
                  + make_interval(mins => COALESCE((prev->>'duration')::integer, 0)) > v_seg_start
          )
          -- Ya reservada para cubrir una cita sin profesional que solapa este tramo.
          AND NOT EXISTS (
            SELECT 1 FROM jsonb_array_elements(v_held) AS h
            WHERE h->>'employee_id' = e.id
              AND (h->>'starts_at')::timestamp < v_seg_end
              AND (h->>'ends_at')::timestamp > v_seg_start
          );

        -- Cada cita sin profesional se asigna a alguien libre durante TODA la cita
        -- y elegible para alguno de sus servicios. Se prefiere a quien no es candidata
        -- del servicio nuevo: así una clásica sin asignar no le quita el cupo de anime
        -- a Karelis si Stephani puede tomarla.
        IF cardinality(v_cands) > 0 THEN
          FOR v_u_id, v_u_services, v_u_start, v_u_end IN
            SELECT a.id,
                   COALESCE(
                     NULLIF((SELECT array_agg(s.service_id::text) FROM public.appointment_services s
                             WHERE s.appointment_id = a.id), '{}'::text[]),
                     NULLIF(a.service_ids::text[], '{}'::text[]),
                     CASE WHEN a.service_id IS NOT NULL THEN ARRAY[a.service_id::text] END
                   ),
                   a.date,
                   a.date + make_interval(mins => COALESCE(a.duration, 0))
            FROM public.appointments a
            WHERE a.tenant_id = p_tenant_id
              AND a.status <> 'cancelled'
              AND a.employee_id IS NULL
              AND a.date < v_seg_end
              AND a.date + make_interval(mins => COALESCE(a.duration, 0)) > v_seg_start
              AND NOT EXISTS (
                SELECT 1 FROM public.appointment_services s
                WHERE s.appointment_id = a.id AND s.employee_id IS NOT NULL
              )
            ORDER BY a.date, a.id
          LOOP
            IF EXISTS (
              SELECT 1 FROM jsonb_array_elements(v_held) AS h
              WHERE h->>'appointment_id' = v_u_id::text
            ) THEN
              CONTINUE;
            END IF;

            v_pick := NULL;
            SELECT e.id INTO v_pick
            FROM public.employees e
            WHERE e.tenant_id = p_tenant_id
              AND e.is_active
              AND (
                v_u_services IS NULL
                OR EXISTS (
                  SELECT 1 FROM unnest(v_u_services) AS us(sid)
                  WHERE public.employee_eligible_for_service(p_tenant_id, e.id, us.sid, v_day)
                )
              )
              AND public.employee_is_free(p_tenant_id, e.id, v_u_start, v_u_end)
              AND NOT EXISTS (
                SELECT 1 FROM jsonb_array_elements(v_assign) AS prev
                WHERE prev->>'employee_id' = e.id
                  AND (prev->>'starts_at')::timestamp < v_u_end
                  AND (prev->>'starts_at')::timestamp
                      + make_interval(mins => COALESCE((prev->>'duration')::integer, 0)) > v_u_start
              )
              AND NOT EXISTS (
                SELECT 1 FROM jsonb_array_elements(v_held) AS h
                WHERE h->>'employee_id' = e.id
                  AND (h->>'starts_at')::timestamp < v_u_end
                  AND (h->>'ends_at')::timestamp > v_u_start
              )
            ORDER BY
              (e.id::text = ANY(v_cands)) ASC,
              array_position(v_cands, e.id::text) DESC NULLS LAST,
              e.name,
              e.id
            LIMIT 1;

            IF v_pick IS NOT NULL THEN
              v_held := v_held || jsonb_build_array(jsonb_build_object(
                'appointment_id', v_u_id,
                'employee_id', v_pick,
                'starts_at', to_char(v_u_start, 'YYYY-MM-DD"T"HH24:MI:SS'),
                'ends_at', to_char(v_u_end, 'YYYY-MM-DD"T"HH24:MI:SS')
              ));
              IF v_pick = ANY(v_cands) THEN
                v_cands := array_remove(v_cands, v_pick);
              END IF;
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
  'Plan 18: horarios disponibles por carrito. Una cita sin profesional no bloquea a quien no la puede cubrir si hay otra profesional libre.';

-- Reemplaza la lista de servicios en una sola transacción.
CREATE OR REPLACE FUNCTION public.save_employee_services(
  p_employee_id text,
  p_does_all boolean,
  p_service_ids text[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $s$
DECLARE
  v_tenant text := public.current_tenant_id();
  v_asked integer;
  v_found integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'No tienes permiso para editar la disponibilidad';
  END IF;
  IF v_tenant IS NULL OR v_tenant = '' THEN
    RAISE EXCEPTION 'No se pudo identificar el negocio';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = p_employee_id AND e.tenant_id = v_tenant
  ) THEN
    RAISE EXCEPTION 'No se encontró el profesional';
  END IF;

  IF NOT COALESCE(p_does_all, true) THEN
    SELECT count(*) INTO v_asked
    FROM (SELECT DISTINCT sid FROM unnest(COALESCE(p_service_ids, '{}'::text[])) AS x(sid)) d;

    SELECT count(*) INTO v_found
    FROM (
      SELECT DISTINCT x.sid
      FROM unnest(COALESCE(p_service_ids, '{}'::text[])) AS x(sid)
      JOIN public.services s ON s.id = x.sid AND s.tenant_id = v_tenant
    ) ok;

    IF v_asked <> v_found THEN
      RAISE EXCEPTION 'Hay un servicio que no pertenece a este negocio';
    END IF;
  END IF;

  UPDATE public.employees
     SET does_all_services = COALESCE(p_does_all, true)
   WHERE id = p_employee_id AND tenant_id = v_tenant;

  DELETE FROM public.employee_services
   WHERE employee_id = p_employee_id AND tenant_id = v_tenant;

  IF NOT COALESCE(p_does_all, true) AND COALESCE(cardinality(p_service_ids), 0) > 0 THEN
    INSERT INTO public.employee_services (tenant_id, employee_id, service_id)
    SELECT DISTINCT v_tenant, p_employee_id, x.sid
    FROM unnest(p_service_ids) AS x(sid);
  END IF;
END;
$s$;

REVOKE ALL ON FUNCTION public.save_employee_services(text, boolean, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_employee_services(text, boolean, text[])
  TO authenticated, service_role;

-- Reemplaza el horario semanal en una sola transacción. Lista vacía = horario del negocio.
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
