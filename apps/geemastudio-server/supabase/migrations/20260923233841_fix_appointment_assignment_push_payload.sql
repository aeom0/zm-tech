CREATE OR REPLACE FUNCTION public.notify_appointment_assigned()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_employee_id text;
  v_user_id uuid;
  v_client_name text;
  v_date_text text;
  v_time_text text;
  v_employee_name text;
  v_service_names text;
  v_title text;
  v_body text;
  v_supabase_url text := 'https://udelxwwnyivknslueerr.supabase.co';
  v_anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZWx4d3dueWl2a25zbHVlZXJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMjcxNTUsImV4cCI6MjA4NjYwMzE1NX0.8v1hv5VPPj9TPjYSH7KK1DiXEx7qrC6ipZnx5bSEfRk';
BEGIN
  v_employee_id := NEW.employee_id;
  IF v_employee_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.employee_id IS NOT DISTINCT FROM NEW.employee_id AND OLD.date IS NOT DISTINCT FROM NEW.date THEN RETURN NEW; END IF;

  SELECT id INTO v_user_id
    FROM public.profiles
   WHERE employee_id = v_employee_id
     AND tenant_id = NEW.tenant_id
     AND push_token IS NOT NULL
   LIMIT 1;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  SELECT name INTO v_employee_name
    FROM public.employees
   WHERE id = v_employee_id AND tenant_id = NEW.tenant_id;
  v_employee_name := COALESCE(split_part(v_employee_name, ' ', 1), 'Sin asignar');

  IF NEW.service_ids IS NOT NULL AND array_length(NEW.service_ids, 1) > 0 THEN
    SELECT string_agg(name, ', ' ORDER BY name) INTO v_service_names
      FROM public.services
     WHERE id = ANY(NEW.service_ids) AND tenant_id = NEW.tenant_id;
  ELSE
    SELECT name INTO v_service_names
      FROM public.services
     WHERE id = NEW.service_id AND tenant_id = NEW.tenant_id;
  END IF;
  v_service_names := COALESCE(v_service_names, 'Servicio no especificado');

  v_date_text := TO_CHAR(NEW.date AT TIME ZONE 'America/Lima', 'DD/MM/YYYY');
  v_time_text := TO_CHAR(NEW.date AT TIME ZONE 'America/Lima', 'HH12:MI AM');
  v_client_name := COALESCE(NEW.client_name, 'Cliente');
  IF TG_OP = 'INSERT' THEN
    v_title := '📅 Nueva cita asignada — ' || v_employee_name;
  ELSE
    v_title := '🔄 Cita reasignada — ' || v_employee_name;
  END IF;
  v_body := '👤 ' || v_client_name || chr(10) || '💅 ' || v_service_names || chr(10) || '📆 ' || v_date_text || ' · ' || v_time_text;

  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-notification',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_anon_key),
    body := jsonb_build_object(
      'user_ids', jsonb_build_array(v_user_id::text),
      'title', v_title,
      'body', v_body,
      'data', jsonb_build_object('appointment_id', NEW.id, 'type', 'appointment_assigned')
    )
  );
  RETURN NEW;
END;
$function$;
