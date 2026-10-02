SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;
CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";
COMMENT ON SCHEMA "public" IS 'standard public schema';
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
CREATE OR REPLACE FUNCTION "public"."get_top_completed_services"("p_status_since" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_limit" integer DEFAULT 20) RETURNS TABLE("service_id" character varying, "pack_id" character varying, "count" bigint)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT
    CASE WHEN aps.pack_id IS NULL THEN aps.service_id END AS service_id,
    aps.pack_id,
    COUNT(*)::bigint AS count
  FROM public.appointment_services aps
  JOIN public.appointments a ON a.id = aps.appointment_id
  WHERE a.status = 'completed'
    AND (p_status_since IS NULL OR a.date >= p_status_since)
  GROUP BY aps.pack_id, CASE WHEN aps.pack_id IS NULL THEN aps.service_id END
  ORDER BY count DESC
  LIMIT p_limit;
$$;
ALTER FUNCTION "public"."get_top_completed_services"("p_status_since" timestamp with time zone, "p_limit" integer) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."invoke_waba_pricing_sync"() RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions', 'vault'
    AS $$
DECLARE
  v_sync_secret text;
  v_service_jwt text;
  v_request_id bigint;
BEGIN
  SELECT decrypted_secret INTO v_service_jwt
  FROM vault.decrypted_secrets
  WHERE name = 'waba_pricing_sync_service_jwt';

  SELECT decrypted_secret INTO v_sync_secret
  FROM vault.decrypted_secrets
  WHERE name = 'waba_pricing_sync_secret';

  IF coalesce(v_sync_secret, '') = '' OR coalesce(v_service_jwt, '') = '' THEN
    RAISE WARNING
      '[invoke_waba_pricing_sync] Faltan secrets en Vault: waba_pricing_sync_secret o waba_pricing_sync_service_jwt';
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := 'https://udelxwwnyivknslueerr.supabase.co/functions/v1/waba-pricing-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_jwt,
      'X-Sync-Secret', v_sync_secret
    ),
    body := '{}'::jsonb
  )
  INTO v_request_id;

  RETURN v_request_id;
END;
$$;
ALTER FUNCTION "public"."invoke_waba_pricing_sync"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."invoke_waba_pricing_sync"() IS 'Invoca waba-pricing-sync vía pg_net. Secrets en Vault: waba_pricing_sync_secret, waba_pricing_sync_service_jwt. Solo postgres/service_role.';
CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.role IN ('dev', 'owner')
  );
$$;
ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."is_admin"() IS 'Indica si el usuario autenticado tiene rol dev u owner.';
CREATE OR REPLACE FUNCTION "public"."notify_appointment_assigned"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_employee_id     TEXT;
  v_user_id         UUID;
  v_client_name     TEXT;
  v_date_text       TEXT;
  v_time_text       TEXT;
  v_employee_name   TEXT;
  v_service_names   TEXT;
  v_title           TEXT;
  v_body            TEXT;
  v_supabase_url    TEXT := 'https://udelxwwnyivknslueerr.supabase.co';
  v_anon_key        TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZWx4d3dueWl2a25zbHVlZXJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMjcxNTUsImV4cCI6MjA4NjYwMzE1NX0.8v1hv5VPPj9TPjYSH7KK1DiXEx7qrC6ipZnx5bSEfRk';
BEGIN
  v_employee_id := NEW.employee_id;
  IF v_employee_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- En UPDATE: solo notificar si employee_id o fecha cambiaron
  IF TG_OP = 'UPDATE'
     AND OLD.employee_id IS NOT DISTINCT FROM NEW.employee_id
     AND OLD.date IS NOT DISTINCT FROM NEW.date THEN
    RETURN NEW;
  END IF;

  -- Buscar push_token del perfil vinculado al employee
  SELECT id INTO v_user_id
    FROM public.profiles
   WHERE employee_id = v_employee_id
     AND push_token IS NOT NULL
   LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Nombre de la chica
  SELECT name INTO v_employee_name
    FROM public.employees
   WHERE id = v_employee_id;
  v_employee_name := COALESCE(split_part(v_employee_name, ' ', 1), 'Sin asignar');

  -- Nombre(s) de servicio(s)
  IF NEW.service_ids IS NOT NULL AND array_length(NEW.service_ids, 1) > 0 THEN
    SELECT string_agg(name, ', ' ORDER BY name)
      INTO v_service_names
      FROM public.services
     WHERE id = ANY(NEW.service_ids);
  ELSE
    SELECT name INTO v_service_names
      FROM public.services
     WHERE id = NEW.service_id;
  END IF;
  v_service_names := COALESCE(v_service_names, 'Servicio no especificado');

  -- Fecha y hora en Lima (UTC-5)
  v_date_text := TO_CHAR(NEW.date AT TIME ZONE 'America/Lima', 'DD/MM/YYYY');
  v_time_text := TO_CHAR(NEW.date AT TIME ZONE 'America/Lima', 'HH12:MI AM');

  v_client_name := COALESCE(NEW.client_name, 'Cliente');

  IF TG_OP = 'INSERT' THEN
    v_title := '📅 Nueva cita asignada — ' || v_employee_name;
  ELSE
    v_title := '🔄 Cita reasignada — ' || v_employee_name;
  END IF;

  v_body := '👤 ' || v_client_name
         || chr(10) || '💅 ' || v_service_names
         || chr(10) || '📆 ' || v_date_text || ' · ' || v_time_text;

  PERFORM net.http_post(
    url     := v_supabase_url || '/functions/v1/send-notification',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_anon_key
    ),
    body    := jsonb_build_object(
      'user_id', v_user_id::text,
      'title',   v_title,
      'body',    v_body,
      'data',    jsonb_build_object(
        'appointment_id', NEW.id,
        'type', 'appointment_assigned'
      )
    )
  );

  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."notify_appointment_assigned"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."reset_waba_session_after_app_booking"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
      updated_at = NOW()
    WHERE phone = wa_phone
      AND step = 'awaiting_datetime';
  END LOOP;

  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."reset_waba_session_after_app_booking"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."update_promotions_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'extensions'
    AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
ALTER FUNCTION "public"."update_promotions_updated_at"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."wa_phone_variants"("raw_phone" "text") RETURNS "text"[]
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
  digits text;
  variants text[] := ARRAY[]::text[];
  trimmed text;
BEGIN
  IF raw_phone IS NULL THEN
    RETURN ARRAY[]::text[];
  END IF;

  trimmed := trim(raw_phone);
  IF trimmed = '' THEN
    RETURN ARRAY[]::text[];
  END IF;

  variants := array_append(variants, trimmed);
  digits := regexp_replace(trimmed, '\D', '', 'g');

  IF digits <> '' THEN
    variants := array_append(variants, digits);
    IF length(digits) = 9 THEN
      variants := array_append(variants, '51' || digits);
    ELSIF length(digits) = 11 AND digits LIKE '51%' THEN
      variants := array_append(variants, digits);
    ELSIF length(digits) = 10 AND digits LIKE '9%' THEN
      variants := array_append(variants, '51' || digits);
    END IF;
    IF length(digits) >= 9 THEN
      variants := array_append(variants, right(digits, 9));
      variants := array_append(variants, '51' || right(digits, 9));
    END IF;
  END IF;

  SELECT COALESCE(array_agg(DISTINCT v), ARRAY[]::text[])
  INTO variants
  FROM unnest(variants) AS v
  WHERE v IS NOT NULL AND v <> '';

  RETURN variants;
END;
$$;
ALTER FUNCTION "public"."wa_phone_variants"("raw_phone" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."waba_claim_action_debounce"("p_phone" "text", "p_kind" "text", "p_window_seconds" integer DEFAULT 300) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  won boolean := false;
BEGIN
  IF p_phone IS NULL OR length(trim(p_phone)) = 0 THEN
    RETURN false;
  END IF;
  IF p_kind IS NULL OR length(trim(p_kind)) = 0 THEN
    RETURN false;
  END IF;
  IF p_window_seconds IS NULL OR p_window_seconds < 1 THEN
    p_window_seconds := 300;
  END IF;

  INSERT INTO public.wa_action_debounce AS d (phone, kind, claimed_at)
  VALUES (trim(p_phone), trim(p_kind), now())
  ON CONFLICT (phone, kind) DO UPDATE
    SET claimed_at = now()
    WHERE d.claimed_at < now() - make_interval(secs => p_window_seconds)
  RETURNING true INTO won;

  RETURN COALESCE(won, false);
END;
$$;
ALTER FUNCTION "public"."waba_claim_action_debounce"("p_phone" "text", "p_kind" "text", "p_window_seconds" integer) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."waba_cleanup_action_debounce"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  DELETE FROM public.wa_action_debounce
  WHERE claimed_at < now() - interval '1 day';
END;
$$;
ALTER FUNCTION "public"."waba_cleanup_action_debounce"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."waba_find_ads_bounce_phones"("min_minutes" integer, "max_minutes" integer) RETURNS TABLE("phone" "text", "from_ad_at" timestamp with time zone, "session_step" "text", "ads_bounce_nudge_sent_at" timestamp with time zone)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT
    s.phone,
    s.from_ad_at,
    s.step,
    s.ads_bounce_nudge_sent_at
  FROM public.whatsapp_sessions s
  WHERE s.from_ad_at IS NOT NULL
    AND s.from_ad_at < now() - (min_minutes || ' minutes')::interval
    AND s.from_ad_at > now() - (max_minutes || ' minutes')::interval
    AND (
      s.ads_bounce_nudge_sent_at IS NULL
      OR s.ads_bounce_nudge_sent_at < s.from_ad_at
    )
    AND (
      s.browse_reengage_sent_at IS NULL
      OR s.browse_reengage_sent_at < s.from_ad_at
    )
    AND (
      s.watchdog_sent_at IS NULL
      OR s.watchdog_sent_at < s.from_ad_at
    )
    AND (s.step IS NULL OR s.step = 'browsing')
    AND (
      s.cart_items IS NULL
      OR btrim(s.cart_items) = ''
      OR s.cart_items = '[]'
      OR s.cart_items::jsonb = '[]'::jsonb
    )
    AND (
      s.cart_service_ids IS NULL
      OR btrim(s.cart_service_ids) = ''
      OR s.cart_service_ids = '[]'
      OR s.cart_service_ids::jsonb = '[]'::jsonb
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.wa_messages m
      WHERE m.phone = s.phone
        AND m.direction = 'in'
        AND m.created_at > s.from_ad_at
    );
$$;
ALTER FUNCTION "public"."waba_find_ads_bounce_phones"("min_minutes" integer, "max_minutes" integer) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."waba_find_idle_browse_phones"("min_minutes" integer, "max_minutes" integer) RETURNS TABLE("phone" "text", "last_out_at" timestamp with time zone, "session_step" "text", "browse_reengage_sent_at" timestamp with time zone)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT
    m.phone,
    m.created_at AS last_out_at,
    s.step,
    s.browse_reengage_sent_at
  FROM (
    SELECT DISTINCT ON (phone) phone, direction, created_at
    FROM public.wa_messages
    ORDER BY phone, created_at DESC
  ) m
  INNER JOIN public.whatsapp_sessions s ON s.phone = m.phone
  CROSS JOIN LATERAL (
    SELECT MAX(mi.created_at) AS last_in_at
    FROM public.wa_messages mi
    WHERE mi.phone = m.phone
      AND mi.direction = 'in'
      AND mi.created_at > now() - interval '24 hours'
  ) li
  WHERE m.direction = 'out'
    AND li.last_in_at IS NOT NULL
    AND m.created_at < now() - (min_minutes || ' minutes')::interval
    AND m.created_at > now() - (max_minutes || ' minutes')::interval
    AND (s.step IS NULL OR s.step = 'browsing')
    AND (
      s.cart_items IS NULL
      OR btrim(s.cart_items) = ''
      OR s.cart_items = '[]'
      OR s.cart_items::jsonb = '[]'::jsonb
    )
    AND (
      s.cart_service_ids IS NULL
      OR btrim(s.cart_service_ids) = ''
      OR s.cart_service_ids = '[]'
      OR s.cart_service_ids::jsonb = '[]'::jsonb
    )
    AND (
      s.browse_reengage_sent_at IS NULL
      OR s.browse_reengage_sent_at < li.last_in_at
    )
    AND (
      s.ads_bounce_nudge_sent_at IS NULL
      OR s.ads_bounce_nudge_sent_at < li.last_in_at
    )
    AND (
      s.watchdog_sent_at IS NULL
      OR s.watchdog_sent_at < li.last_in_at
    )
    AND (
      s.from_ad_at IS NULL
      OR s.from_ad_at < li.last_in_at
    );
$$;
ALTER FUNCTION "public"."waba_find_idle_browse_phones"("min_minutes" integer, "max_minutes" integer) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."waba_find_quality_review_candidates"("min_age_minutes" integer DEFAULT 4, "max_age_minutes" integer DEFAULT 30, "max_rows" integer DEFAULT 8, "include_qa" boolean DEFAULT false) RETURNS TABLE("phone" "text", "last_activity_at" timestamp with time zone, "session_step" "text", "cart_items" "text", "quality_review_sent_at" timestamp with time zone)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  WITH last_msg AS (
    SELECT DISTINCT ON (m.phone)
      m.phone,
      m.created_at AS last_activity_at
    FROM public.wa_messages m
    WHERE include_qa OR m.phone !~ '^519990009'
    ORDER BY m.phone, m.created_at DESC
  ),
  recent_counts AS (
    SELECT
      m.phone,
      count(*) FILTER (WHERE m.direction = 'in') AS ins,
      count(*) FILTER (WHERE m.direction = 'out') AS outs
    FROM public.wa_messages m
    WHERE m.created_at > now() - interval '90 minutes'
      AND (include_qa OR m.phone !~ '^519990009')
    GROUP BY m.phone
  )
  SELECT
    lm.phone,
    lm.last_activity_at,
    s.step,
    s.cart_items,
    s.quality_review_sent_at
  FROM last_msg lm
  INNER JOIN recent_counts rc ON rc.phone = lm.phone
  LEFT JOIN public.whatsapp_sessions s ON s.phone = lm.phone
  WHERE lm.last_activity_at < now() - (min_age_minutes || ' minutes')::interval
    AND lm.last_activity_at > now() - (max_age_minutes || ' minutes')::interval
    AND rc.ins >= 1
    AND rc.outs >= 1
    AND (
      s.quality_review_sent_at IS NULL
      OR s.quality_review_sent_at < lm.last_activity_at
    )
  ORDER BY lm.last_activity_at DESC
  LIMIT GREATEST(1, LEAST(max_rows, 20));
$$;
ALTER FUNCTION "public"."waba_find_quality_review_candidates"("min_age_minutes" integer, "max_age_minutes" integer, "max_rows" integer, "include_qa" boolean) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."waba_find_silent_phones"("min_minutes" integer, "max_minutes" integer) RETURNS TABLE("phone" "text", "last_inbound_at" timestamp with time zone, "session_step" "text", "watchdog_sent_at" timestamp with time zone)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT m.phone, m.created_at AS last_inbound_at, s.step, s.watchdog_sent_at
  FROM (
    SELECT DISTINCT ON (phone) phone, direction, created_at
    FROM public.wa_messages
    ORDER BY phone, created_at DESC
  ) m
  LEFT JOIN public.whatsapp_sessions s ON s.phone = m.phone
  WHERE m.direction = 'in'
    AND m.created_at < now() - (min_minutes || ' minutes')::interval
    AND m.created_at > now() - (max_minutes || ' minutes')::interval
    AND (s.watchdog_sent_at IS NULL OR s.watchdog_sent_at < m.created_at)
    AND (
      s.browse_reengage_sent_at IS NULL
      OR s.browse_reengage_sent_at < m.created_at
    );
$$;
ALTER FUNCTION "public"."waba_find_silent_phones"("min_minutes" integer, "max_minutes" integer) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."waba_release_action_debounce"("p_phone" "text", "p_kind" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF p_phone IS NULL OR p_kind IS NULL THEN
    RETURN;
  END IF;
  DELETE FROM public.wa_action_debounce
    WHERE phone = trim(p_phone) AND kind = trim(p_kind);
END;
$$;
ALTER FUNCTION "public"."waba_release_action_debounce"("p_phone" "text", "p_kind" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."waba_release_phone_lock"("p_phone" "text") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT pg_advisory_unlock(hashtext(p_phone));
$$;
ALTER FUNCTION "public"."waba_release_phone_lock"("p_phone" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."waba_try_phone_lock"("p_phone" "text") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT pg_try_advisory_lock(hashtext(p_phone));
$$;
ALTER FUNCTION "public"."waba_try_phone_lock"("p_phone" "text") OWNER TO "postgres";
SET default_tablespace = '';
SET default_table_access_method = "heap";
CREATE TABLE IF NOT EXISTS "public"."ai_usage_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "trigger_type" "text" NOT NULL,
    "input_tokens" integer DEFAULT 0 NOT NULL,
    "output_tokens" integer DEFAULT 0 NOT NULL,
    "phone_hash" "text"
);
ALTER TABLE "public"."ai_usage_log" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."anthropic_billing_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "billing_month_key" "text" NOT NULL,
    "period_start" timestamp with time zone NOT NULL,
    "period_end" timestamp with time zone NOT NULL,
    "total_cost_usd" numeric(16,6) NOT NULL,
    "source" "text" DEFAULT 'anthropic_cost_report'::"text" NOT NULL,
    CONSTRAINT "anthropic_billing_snapshots_total_cost_usd_check" CHECK (("total_cost_usd" >= (0)::numeric))
);
ALTER TABLE "public"."anthropic_billing_snapshots" OWNER TO "postgres";
COMMENT ON TABLE "public"."anthropic_billing_snapshots" IS 'Costo USD agregado vía Anthropic /v1/organizations/cost_report; inserta solo la Edge Function con service role.';
CREATE TABLE IF NOT EXISTS "public"."app_config" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."app_config" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."appointment_services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "appointment_id" character varying NOT NULL,
    "service_id" character varying NOT NULL,
    "employee_id" character varying,
    "price" numeric(10,2) DEFAULT 0 NOT NULL,
    "duration" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "pack_id" character varying
);
ALTER TABLE "public"."appointment_services" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."appointment_verifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "appointment_id" character varying,
    "client_phone" "text" NOT NULL,
    "client_name" "text" NOT NULL,
    "service_name" "text" NOT NULL,
    "appointment_date" timestamp without time zone NOT NULL,
    "amount_deposit" numeric(10,2) NOT NULL,
    "amount_total" numeric(10,2) NOT NULL,
    "payment_screenshot_url" "text",
    "pre_service_photo_url" "text",
    "status" "text" DEFAULT 'pending_payment'::"text" NOT NULL,
    "vanessa_note" "text",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "approved_at" timestamp without time zone,
    "rejected_at" timestamp without time zone,
    "pre_service_photo_url_2" "text"
);
ALTER TABLE "public"."appointment_verifications" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."appointments" (
    "id" character varying DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" character varying,
    "client_name" "text" NOT NULL,
    "employee_id" character varying,
    "service_id" character varying,
    "date" timestamp without time zone NOT NULL,
    "duration" integer NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp without time zone,
    "client_phone" "text",
    "client_document" "text",
    "service_ids" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "source" "text" DEFAULT 'manual'::"text",
    "whatsapp_phone" "text",
    "deposit_amount" numeric(10,2),
    "payment_method" "text" DEFAULT 'yape_plin'::"text",
    "service_names_snapshot" "text"[],
    "reminder_sent_at" timestamp with time zone,
    "client_confirmed_at" timestamp with time zone,
    "same_day_reminder_sent_at" timestamp with time zone,
    "no_show_reason" "text",
    "reference_image_path" "text",
    "reference_received_at" timestamp with time zone,
    "reference_reviewed_at" timestamp with time zone,
    "reference_image_paths" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "reference_url" "text"
);
ALTER TABLE "public"."appointments" OWNER TO "postgres";
COMMENT ON COLUMN "public"."appointments"."client_document" IS 'DNI u otro documento de identidad (Perú)';
COMMENT ON COLUMN "public"."appointments"."reminder_sent_at" IS 'Timestamp cuando se envió el recordatorio 24h antes. Null = no enviado aún.';
COMMENT ON COLUMN "public"."appointments"."client_confirmed_at" IS 'Timestamp de cuando el cliente presionó el botón "Confirmo mi cita" en respuesta al recordatorio WABA. NULL = no confirmó o no aplica.';
COMMENT ON COLUMN "public"."appointments"."same_day_reminder_sent_at" IS 'Timestamp de cuando se envió el recordatorio de 3h antes (plantilla recordatorio_mismo_dia_zm). NULL = no enviado aún.';
COMMENT ON COLUMN "public"."appointments"."no_show_reason" IS 'Motivo que dio la clienta al presionar "No podré asistir" en el recordatorio same-day. NULL = no aplica / no se preguntó.';
COMMENT ON COLUMN "public"."appointments"."reference_image_path" IS 'Path en Storage bucket service-references (foto modelo/diseño WA)';
COMMENT ON COLUMN "public"."appointments"."reference_received_at" IS 'Cuándo la clienta envió la referencia por WhatsApp';
COMMENT ON COLUMN "public"."appointments"."reference_reviewed_at" IS 'Cuándo staff marcó la referencia como revisada';
COMMENT ON COLUMN "public"."appointments"."reference_image_paths" IS 'Paths Storage (bucket service-references); máx. 5 fotos modelo/diseño WA';
COMMENT ON COLUMN "public"."appointments"."reference_url" IS 'Link de referencia (Pinterest, Instagram, etc.) enviado por WA';
CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" character varying DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "phone" "text",
    "email" "text",
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "dni" "text",
    "phone_country" "text",
    "phone_normalized" "text",
    "wa_user_id" "text",
    "wa_username" "text"
);
ALTER TABLE "public"."clients" OWNER TO "postgres";
COMMENT ON COLUMN "public"."clients"."wa_username" IS 'Username WhatsApp/Meta del perfil (contacts.profile.username), tipico en CTWA BSUID.';
CREATE TABLE IF NOT EXISTS "public"."employees" (
    "id" character varying DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "color" "text" DEFAULT '#D4AF37'::"text" NOT NULL,
    "role" "text" DEFAULT 'employee'::"text" NOT NULL,
    "commission_percentage" integer DEFAULT 0 NOT NULL,
    "notes" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."employees" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."inventory_items" (
    "id" character varying DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" DEFAULT 'countable'::"text" NOT NULL,
    "quantity" integer DEFAULT 0 NOT NULL,
    "min_stock" integer DEFAULT 5 NOT NULL,
    "unit" "text" DEFAULT 'unidad'::"text" NOT NULL,
    "price" numeric(10,2),
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "category" "text" DEFAULT 'insumos'::"text" NOT NULL,
    "cost" numeric(10,2)
);
ALTER TABLE "public"."inventory_items" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."packs" (
    "id" character varying DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "category_id" character varying NOT NULL,
    "service_ids" "text" DEFAULT '[]'::"text" NOT NULL,
    "pack_price" numeric(10,2) NOT NULL,
    "pack_price_card" numeric(10,2),
    "short_name" character varying(60),
    "emoji" "text" DEFAULT '✨'::"text" NOT NULL,
    "badge" "text" DEFAULT 'PACK'::"text" NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."packs" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" character varying DEFAULT "gen_random_uuid"() NOT NULL,
    "appointment_id" character varying,
    "amount" numeric(10,2) NOT NULL,
    "method" "text" DEFAULT 'cash'::"text" NOT NULL,
    "date" timestamp without time zone DEFAULT "now"() NOT NULL,
    "notes" "text",
    "is_abono" boolean DEFAULT false NOT NULL,
    "service_total" numeric(10,2),
    "discount_percentage" numeric(5,2),
    "discount_type" "text",
    "employee_id" character varying
);
ALTER TABLE "public"."payments" OWNER TO "postgres";
COMMENT ON COLUMN "public"."payments"."is_abono" IS 'True si es abono inicial (20%) por reserva vía WhatsApp';
COMMENT ON COLUMN "public"."payments"."service_total" IS 'Valor total del servicio cuando is_abono=true (para referencia)';
CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "employee_id" character varying,
    "full_name" "text",
    "avatar_url" "text",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "push_token" "text"
);
ALTER TABLE "public"."profiles" OWNER TO "postgres";
COMMENT ON TABLE "public"."profiles" IS 'Perfiles de usuario vinculados a auth.users y employees para control de roles.';
COMMENT ON COLUMN "public"."profiles"."role" IS 'Rol de acceso: dev, owner, staff';
COMMENT ON COLUMN "public"."profiles"."employee_id" IS 'Referencia opcional a la chica (employees.id)';
CREATE TABLE IF NOT EXISTS "public"."promo_broadcast_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "broadcast_id" "uuid" NOT NULL,
    "client_id" character varying,
    "client_name" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "error_msg" "text",
    "sent_at" timestamp without time zone
);
ALTER TABLE "public"."promo_broadcast_items" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."promo_broadcasts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "template" "text" NOT NULL,
    "body_text" "text" NOT NULL,
    "image_url" "text",
    "wa_media_id" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "total_sent" integer DEFAULT 0 NOT NULL,
    "total_failed" integer DEFAULT 0 NOT NULL,
    "created_by" "uuid",
    "sent_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."promo_broadcasts" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."promotion_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "promotion_id" "uuid" NOT NULL,
    "item_type" "text" NOT NULL,
    "item_id" character varying NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "discounted_price" numeric(10,2) NOT NULL,
    "discounted_price_card" numeric(10,2),
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."promotion_items" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."promotions" (
    "id" character varying DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "service_ids" "text" DEFAULT '[]'::"text" NOT NULL,
    "promo_price" numeric(10,2),
    "original_price" numeric(10,2),
    "emoji" "text" DEFAULT '✨'::"text" NOT NULL,
    "accent_color" "text" DEFAULT 'violet'::"text" NOT NULL,
    "badge" "text" DEFAULT 'PROMO'::"text" NOT NULL,
    "valid_from" timestamp without time zone,
    "valid_until" timestamp without time zone,
    "valid_days" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "promo_price_card" numeric(10,2)
);
ALTER TABLE "public"."promotions" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."push_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "token" "text" NOT NULL,
    "platform" "text" DEFAULT 'expo'::"text",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."push_tokens" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."salon_holidays" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" NOT NULL,
    "name" "text" NOT NULL,
    "is_closed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "open_until_hour" smallint DEFAULT 12 NOT NULL,
    CONSTRAINT "salon_holidays_open_until_hour_check" CHECK ((("open_until_hour" >= 10) AND ("open_until_hour" <= 18)))
);
ALTER TABLE "public"."salon_holidays" OWNER TO "postgres";
COMMENT ON COLUMN "public"."salon_holidays"."open_until_hour" IS 'Última hora de inicio de cita en feriado con CC abierto (ej. 12 = hasta 12:00, 14 = hasta 2:00 PM). Ignorado si is_closed.';
CREATE TABLE IF NOT EXISTS "public"."service_categories" (
    "id" character varying DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "order" integer DEFAULT 0 NOT NULL
);
ALTER TABLE "public"."service_categories" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."service_portfolio_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "service_id" character varying NOT NULL,
    "image_url" "text" NOT NULL,
    "caption" "text" DEFAULT ''::"text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "service_portfolio_images_sort_check" CHECK ((("sort_order" >= 0) AND ("sort_order" <= 3)))
);
ALTER TABLE "public"."service_portfolio_images" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."services" (
    "id" character varying DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "category_id" character varying,
    "price" numeric(10,2) NOT NULL,
    "duration" integer NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "subcategory" "text",
    "short_name" character varying(24),
    "price_card" numeric(10,2)
);
ALTER TABLE "public"."services" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."wa_action_debounce" (
    "phone" "text" NOT NULL,
    "kind" "text" NOT NULL,
    "claimed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."wa_action_debounce" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."wa_error_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "phone" "text",
    "step" "text",
    "msg_type" "text",
    "error_message" "text" NOT NULL,
    "error_stack" "text",
    "context" "jsonb",
    "fallback_sent" boolean DEFAULT false NOT NULL
);
ALTER TABLE "public"."wa_error_log" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."wa_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "phone" "text" NOT NULL,
    "direction" "text" NOT NULL,
    "msg_type" "text" DEFAULT 'text'::"text" NOT NULL,
    "content" "text",
    "step_before" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "wamid" "text",
    "media_id" "text",
    "image_url" "text",
    "source" "text",
    CONSTRAINT "wa_messages_direction_check" CHECK (("direction" = ANY (ARRAY['in'::"text", 'out'::"text"])))
);
ALTER TABLE "public"."wa_messages" OWNER TO "postgres";
COMMENT ON COLUMN "public"."wa_messages"."media_id" IS 'Meta media id (image/audio/document/sticker) para re-descarga ~30d';
COMMENT ON COLUMN "public"."wa_messages"."source" IS 'Origen del mensaje saliente: bot | panel | nudge | staff_app | template | null (histórico)';
CREATE TABLE IF NOT EXISTS "public"."waba_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "config_key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "category" "text" NOT NULL,
    "config_value" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid",
    CONSTRAINT "waba_config_category_check" CHECK (("category" = ANY (ARRAY['campanas'::"text", 'mensajes'::"text", 'haiku'::"text", 'historial'::"text", 'portafolio'::"text"])))
);
ALTER TABLE "public"."waba_config" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."waba_intent_shadow_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "phone" "text" NOT NULL,
    "wamid" "text",
    "step" "text",
    "has_cart" boolean DEFAULT false NOT NULL,
    "regex_intent" "text" NOT NULL,
    "haiku_intent" "text",
    "agree" boolean GENERATED ALWAYS AS (("regex_intent" = "haiku_intent")) STORED,
    "haiku_latency_ms" integer,
    "haiku_tokens_in" integer,
    "haiku_tokens_out" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "waba_intent_shadow_log_haiku_intent_chk" CHECK ((("haiku_intent" IS NULL) OR ("haiku_intent" = ANY (ARRAY['crear_cita'::"text", 'reclamo_garantia'::"text", 'reprogramar_cita_soft'::"text", 'confirmar_cita_texto_libre'::"text", 'otro'::"text"])))),
    CONSTRAINT "waba_intent_shadow_log_regex_intent_chk" CHECK (("regex_intent" = ANY (ARRAY['crear_cita'::"text", 'reclamo_garantia'::"text", 'reprogramar_cita_soft'::"text", 'confirmar_cita_texto_libre'::"text", 'otro'::"text"])))
);
ALTER TABLE "public"."waba_intent_shadow_log" OWNER TO "postgres";
COMMENT ON TABLE "public"."waba_intent_shadow_log" IS 'Piloto modo sombra: regex waterfall vs Haiku (5 intents). No contiene texto del mensaje.';
CREATE TABLE IF NOT EXISTS "public"."waba_pricing_daily" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "waba_id" "text" NOT NULL,
    "date" "date" NOT NULL,
    "pricing_category" "text" NOT NULL,
    "pricing_type" "text" NOT NULL,
    "country_code" "text",
    "cost" numeric(10,4) DEFAULT 0 NOT NULL,
    "volume" integer DEFAULT 0 NOT NULL,
    "synced_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "waba_pricing_daily_cost_check" CHECK (("cost" >= (0)::numeric)),
    CONSTRAINT "waba_pricing_daily_pricing_category_check" CHECK (("pricing_category" = ANY (ARRAY['MARKETING'::"text", 'UTILITY'::"text", 'AUTHENTICATION'::"text", 'AUTHENTICATION_INTERNATIONAL'::"text", 'SERVICE'::"text", 'REFERRAL_CONVERSION'::"text"]))),
    CONSTRAINT "waba_pricing_daily_pricing_type_check" CHECK (("pricing_type" = ANY (ARRAY['REGULAR'::"text", 'FREE_CUSTOMER_SERVICE'::"text", 'FREE_ENTRY_POINT'::"text"]))),
    CONSTRAINT "waba_pricing_daily_volume_check" CHECK (("volume" >= 0))
);
ALTER TABLE "public"."waba_pricing_daily" OWNER TO "postgres";
COMMENT ON TABLE "public"."waba_pricing_daily" IS 'Costos y volumen diarios WABA (Meta pricing_analytics, granularidad DAILY). Upsert idempotente por waba_id+date+dimensiones.';
CREATE TABLE IF NOT EXISTS "public"."waba_pricing_sync_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "waba_id" "text" NOT NULL,
    "range_start" "date" NOT NULL,
    "range_end" "date" NOT NULL,
    "status" "text" NOT NULL,
    "error_message" "text",
    "rows_upserted" integer DEFAULT 0 NOT NULL,
    "executed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "waba_pricing_sync_log_rows_upserted_check" CHECK (("rows_upserted" >= 0)),
    CONSTRAINT "waba_pricing_sync_log_status_check" CHECK (("status" = ANY (ARRAY['success'::"text", 'error'::"text"])))
);
ALTER TABLE "public"."waba_pricing_sync_log" OWNER TO "postgres";
COMMENT ON TABLE "public"."waba_pricing_sync_log" IS 'Auditoría de sync pricing_analytics → waba_pricing_daily (Edge Function con service role).';
CREATE TABLE IF NOT EXISTS "public"."whatsapp_sessions" (
    "phone" "text" NOT NULL,
    "cart_service_ids" "text" DEFAULT '[]'::"text" NOT NULL,
    "step" "text" DEFAULT 'browsing'::"text",
    "parsed_datetime" timestamp without time zone,
    "employee_assignments" "text" DEFAULT '{}'::"text",
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "awaiting_screenshot" boolean DEFAULT false,
    "pre_service_photo_requested" boolean DEFAULT false,
    "pre_service_photo_url" "text",
    "verification_id" "text",
    "selected_day" "text",
    "cart_items" "text" DEFAULT '[]'::"text",
    "pre_service_photo_url_2" "text",
    "pending_photo_areas" "text",
    "nudge1_sent_at" timestamp without time zone,
    "nudge2_sent_at" timestamp without time zone,
    "reschedule_appointment_id" character varying(36),
    "watchdog_sent_at" timestamp with time zone,
    "from_ad_at" timestamp with time zone,
    "ads_bounce_nudge_sent_at" timestamp with time zone,
    "retouch_offer_service_id" character varying(36),
    "retouch_offer_source" "text",
    "retouch_offer_sent_at" timestamp with time zone,
    "retouch_offer_last_appointment_id" character varying(36),
    "browse_reengage_sent_at" timestamp with time zone,
    "quality_review_sent_at" timestamp with time zone,
    "bot_paused_at" timestamp with time zone
);
ALTER TABLE "public"."whatsapp_sessions" OWNER TO "postgres";
COMMENT ON COLUMN "public"."whatsapp_sessions"."reschedule_appointment_id" IS 'UUID de appointments: reprogramación WABA';
COMMENT ON COLUMN "public"."whatsapp_sessions"."retouch_offer_service_id" IS 'Servicio ofrecido en plantilla retoque_reenganche_zm (UUID)';
COMMENT ON COLUMN "public"."whatsapp_sessions"."retouch_offer_source" IS 'cron | manual';
COMMENT ON COLUMN "public"."whatsapp_sessions"."retouch_offer_sent_at" IS 'Cuándo se envió la oferta (cooldown 30d)';
COMMENT ON COLUMN "public"."whatsapp_sessions"."retouch_offer_last_appointment_id" IS 'Cita completed que originó la oferta';
COMMENT ON COLUMN "public"."whatsapp_sessions"."browse_reengage_sent_at" IS 'Reenganche Haiku browsing sin carrito. NULL = no enviado en este episodio (desde el último inbound).';
COMMENT ON COLUMN "public"."whatsapp_sessions"."bot_paused_at" IS 'Si no null, el webhook/crons no responden a este teléfono (staff takeover). Se limpia al enviar desde el panel.';
ALTER TABLE ONLY "public"."ai_usage_log"
    ADD CONSTRAINT "ai_usage_log_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."anthropic_billing_snapshots"
    ADD CONSTRAINT "anthropic_billing_snapshots_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."app_config"
    ADD CONSTRAINT "app_config_pkey" PRIMARY KEY ("key");
ALTER TABLE ONLY "public"."appointment_services"
    ADD CONSTRAINT "appointment_services_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."appointment_verifications"
    ADD CONSTRAINT "appointment_verifications_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."packs"
    ADD CONSTRAINT "packs_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."promo_broadcast_items"
    ADD CONSTRAINT "promo_broadcast_items_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."promo_broadcasts"
    ADD CONSTRAINT "promo_broadcasts_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."promotion_items"
    ADD CONSTRAINT "promotion_items_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."promotions"
    ADD CONSTRAINT "promotions_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."salon_holidays"
    ADD CONSTRAINT "salon_holidays_date_unique" UNIQUE ("date");
ALTER TABLE ONLY "public"."salon_holidays"
    ADD CONSTRAINT "salon_holidays_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."service_categories"
    ADD CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."service_portfolio_images"
    ADD CONSTRAINT "service_portfolio_images_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."service_portfolio_images"
    ADD CONSTRAINT "service_portfolio_images_service_sort_unique" UNIQUE ("service_id", "sort_order");
ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."wa_action_debounce"
    ADD CONSTRAINT "wa_action_debounce_pkey" PRIMARY KEY ("phone", "kind");
ALTER TABLE ONLY "public"."wa_error_log"
    ADD CONSTRAINT "wa_error_log_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."wa_messages"
    ADD CONSTRAINT "wa_messages_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."waba_config"
    ADD CONSTRAINT "waba_config_config_key_key" UNIQUE ("config_key");
ALTER TABLE ONLY "public"."waba_config"
    ADD CONSTRAINT "waba_config_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."waba_intent_shadow_log"
    ADD CONSTRAINT "waba_intent_shadow_log_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."waba_pricing_daily"
    ADD CONSTRAINT "waba_pricing_daily_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."waba_pricing_sync_log"
    ADD CONSTRAINT "waba_pricing_sync_log_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."whatsapp_sessions"
    ADD CONSTRAINT "whatsapp_sessions_pkey" PRIMARY KEY ("phone");
CREATE INDEX "anthropic_billing_snapshots_month_created_idx" ON "public"."anthropic_billing_snapshots" USING "btree" ("billing_month_key", "created_at" DESC);
CREATE UNIQUE INDEX "clients_dni_unique" ON "public"."clients" USING "btree" ("dni") WHERE ("dni" IS NOT NULL);
CREATE UNIQUE INDEX "clients_phone_country_normalized_unique" ON "public"."clients" USING "btree" ("phone_country", "phone_normalized") WHERE ("phone_normalized" IS NOT NULL);
CREATE UNIQUE INDEX "clients_wa_user_id_unique" ON "public"."clients" USING "btree" ("wa_user_id") WHERE ("wa_user_id" IS NOT NULL);
CREATE INDEX "idx_ai_usage_log_created_at" ON "public"."ai_usage_log" USING "btree" ("created_at");
CREATE INDEX "idx_appointment_services_pack_id" ON "public"."appointment_services" USING "btree" ("pack_id");
CREATE INDEX "idx_appointments_client_id" ON "public"."appointments" USING "btree" ("client_id");
CREATE INDEX "idx_appointments_employee_id" ON "public"."appointments" USING "btree" ("employee_id");
CREATE INDEX "idx_appointments_service_id" ON "public"."appointments" USING "btree" ("service_id");
CREATE INDEX "idx_payments_appointment_id" ON "public"."payments" USING "btree" ("appointment_id");
CREATE INDEX "idx_payments_employee_id" ON "public"."payments" USING "btree" ("employee_id");
CREATE INDEX "idx_promo_broadcast_items_broadcast_id" ON "public"."promo_broadcast_items" USING "btree" ("broadcast_id");
CREATE INDEX "idx_promo_broadcast_items_status" ON "public"."promo_broadcast_items" USING "btree" ("status");
CREATE INDEX "idx_promo_broadcasts_created_by" ON "public"."promo_broadcasts" USING "btree" ("created_by");
CREATE INDEX "idx_promo_broadcasts_status" ON "public"."promo_broadcasts" USING "btree" ("status");
CREATE INDEX "idx_salon_holidays_date" ON "public"."salon_holidays" USING "btree" ("date");
CREATE INDEX "idx_service_portfolio_images_service_id" ON "public"."service_portfolio_images" USING "btree" ("service_id");
CREATE INDEX "idx_services_category_id" ON "public"."services" USING "btree" ("category_id");
CREATE INDEX "idx_wa_messages_media_id" ON "public"."wa_messages" USING "btree" ("media_id") WHERE ("media_id" IS NOT NULL);
CREATE INDEX "idx_waba_config_updated_by" ON "public"."waba_config" USING "btree" ("updated_by");
CREATE INDEX "wa_action_debounce_claimed_at_idx" ON "public"."wa_action_debounce" USING "btree" ("claimed_at");
CREATE INDEX "wa_error_log_created_at_idx" ON "public"."wa_error_log" USING "btree" ("created_at");
CREATE INDEX "wa_error_log_phone_idx" ON "public"."wa_error_log" USING "btree" ("phone");
CREATE INDEX "wa_messages_phone_idx" ON "public"."wa_messages" USING "btree" ("phone", "created_at" DESC);
CREATE INDEX "wa_messages_phone_source_created_idx" ON "public"."wa_messages" USING "btree" ("phone", "source", "created_at" DESC) WHERE (("direction" = 'out'::"text") AND ("source" IS NOT NULL));
CREATE UNIQUE INDEX "wa_messages_wamid_unique" ON "public"."wa_messages" USING "btree" ("wamid") WHERE ("wamid" IS NOT NULL);
CREATE INDEX "waba_intent_shadow_log_agree_idx" ON "public"."waba_intent_shadow_log" USING "btree" ("agree", "created_at" DESC) WHERE ("haiku_intent" IS NOT NULL);
CREATE INDEX "waba_intent_shadow_log_created_at_idx" ON "public"."waba_intent_shadow_log" USING "btree" ("created_at" DESC);
CREATE INDEX "waba_intent_shadow_log_phone_idx" ON "public"."waba_intent_shadow_log" USING "btree" ("phone");
CREATE INDEX "waba_intent_shadow_log_wamid_idx" ON "public"."waba_intent_shadow_log" USING "btree" ("wamid") WHERE ("wamid" IS NOT NULL);
CREATE INDEX "waba_pricing_daily_date_idx" ON "public"."waba_pricing_daily" USING "btree" ("date");
CREATE UNIQUE INDEX "waba_pricing_daily_waba_date_dims_unique" ON "public"."waba_pricing_daily" USING "btree" ("waba_id", "date", "pricing_category", "pricing_type", "country_code") NULLS NOT DISTINCT;
CREATE OR REPLACE TRIGGER "promotions_updated_at" BEFORE UPDATE ON "public"."promotions" FOR EACH ROW EXECUTE FUNCTION "public"."update_promotions_updated_at"();
CREATE OR REPLACE TRIGGER "trg_notify_appointment_assigned" AFTER INSERT OR UPDATE OF "employee_id" ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."notify_appointment_assigned"();
CREATE OR REPLACE TRIGGER "trg_reset_waba_session_after_app_booking" AFTER INSERT ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."reset_waba_session_after_app_booking"();
CREATE OR REPLACE TRIGGER "waba_config_updated_at" BEFORE UPDATE ON "public"."waba_config" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();
ALTER TABLE ONLY "public"."appointment_services"
    ADD CONSTRAINT "appointment_services_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "public"."packs"("id");
ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id");
ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id");
ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id");
ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id");
ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id");
ALTER TABLE ONLY "public"."service_portfolio_images"
    ADD CONSTRAINT "service_portfolio_images_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_category_id_service_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id");
ALTER TABLE ONLY "public"."waba_config"
    ADD CONSTRAINT "waba_config_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");
CREATE POLICY "Appointments modify staff and admin" ON "public"."appointments" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = ANY (ARRAY['staff'::"text", 'dev'::"text", 'owner'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = ANY (ARRAY['staff'::"text", 'dev'::"text", 'owner'::"text"]))))));
CREATE POLICY "Clients delete staff and admin" ON "public"."clients" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = ANY (ARRAY['staff'::"text", 'dev'::"text", 'owner'::"text"]))))));
CREATE POLICY "Clients insert staff and admin" ON "public"."clients" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = ANY (ARRAY['staff'::"text", 'dev'::"text", 'owner'::"text"]))))));
CREATE POLICY "Clients select staff and admin" ON "public"."clients" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = ANY (ARRAY['staff'::"text", 'dev'::"text", 'owner'::"text"]))))));
CREATE POLICY "Clients update staff and admin" ON "public"."clients" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = ANY (ARRAY['staff'::"text", 'dev'::"text", 'owner'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = ANY (ARRAY['staff'::"text", 'dev'::"text", 'owner'::"text"]))))));
CREATE POLICY "Employees delete admin" ON "public"."employees" FOR DELETE USING ("public"."is_admin"());
CREATE POLICY "Employees insert admin" ON "public"."employees" FOR INSERT WITH CHECK ("public"."is_admin"());
CREATE POLICY "Employees select authenticated" ON "public"."employees" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));
CREATE POLICY "Employees update admin" ON "public"."employees" FOR UPDATE USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());
CREATE POLICY "Inventory admin only" ON "public"."inventory_items" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());
CREATE POLICY "Payments delete admin" ON "public"."payments" FOR DELETE USING ("public"."is_admin"());
CREATE POLICY "Payments insert admin" ON "public"."payments" FOR INSERT WITH CHECK ("public"."is_admin"());
CREATE POLICY "Payments select admin or staff own" ON "public"."payments" FOR SELECT USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM ("public"."appointments" "a"
     JOIN "public"."profiles" "p" ON ((("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = 'staff'::"text") AND ("p"."employee_id" IS NOT NULL) AND (("p"."employee_id")::"text" = ("a"."employee_id")::"text"))))
  WHERE (("a"."id")::"text" = ("payments"."appointment_id")::"text")))));
CREATE POLICY "Payments update admin" ON "public"."payments" FOR UPDATE USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());
CREATE POLICY "Profiles select own or admin" ON "public"."profiles" FOR SELECT USING ((("id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_admin"()));
CREATE POLICY "Profiles update own or admin" ON "public"."profiles" FOR UPDATE USING ((("id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_admin"())) WITH CHECK ((("id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_admin"()));
CREATE POLICY "Promo broadcast items delete admin" ON "public"."promo_broadcast_items" FOR DELETE USING ("public"."is_admin"());
CREATE POLICY "Promo broadcast items insert admin" ON "public"."promo_broadcast_items" FOR INSERT WITH CHECK ("public"."is_admin"());
CREATE POLICY "Promo broadcast items select admin" ON "public"."promo_broadcast_items" FOR SELECT USING ("public"."is_admin"());
CREATE POLICY "Promo broadcast items update admin" ON "public"."promo_broadcast_items" FOR UPDATE USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());
CREATE POLICY "Promo broadcasts delete admin" ON "public"."promo_broadcasts" FOR DELETE USING ("public"."is_admin"());
CREATE POLICY "Promo broadcasts insert admin" ON "public"."promo_broadcasts" FOR INSERT WITH CHECK ("public"."is_admin"());
CREATE POLICY "Promo broadcasts select admin" ON "public"."promo_broadcasts" FOR SELECT USING ("public"."is_admin"());
CREATE POLICY "Promo broadcasts update admin" ON "public"."promo_broadcasts" FOR UPDATE USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());
CREATE POLICY "Salon holidays delete admin" ON "public"."salon_holidays" FOR DELETE USING ("public"."is_admin"());
CREATE POLICY "Salon holidays insert admin" ON "public"."salon_holidays" FOR INSERT WITH CHECK ("public"."is_admin"());
CREATE POLICY "Salon holidays select authenticated" ON "public"."salon_holidays" FOR SELECT USING (("auth"."uid"() IS NOT NULL));
CREATE POLICY "Salon holidays update admin" ON "public"."salon_holidays" FOR UPDATE USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());
CREATE POLICY "Service categories delete admin" ON "public"."service_categories" FOR DELETE USING ("public"."is_admin"());
CREATE POLICY "Service categories insert admin" ON "public"."service_categories" FOR INSERT WITH CHECK ("public"."is_admin"());
CREATE POLICY "Service categories select authenticated" ON "public"."service_categories" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));
CREATE POLICY "Service categories update admin" ON "public"."service_categories" FOR UPDATE USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());
CREATE POLICY "Services delete admin" ON "public"."services" FOR DELETE USING ("public"."is_admin"());
CREATE POLICY "Services insert admin" ON "public"."services" FOR INSERT WITH CHECK ("public"."is_admin"());
CREATE POLICY "Services select authenticated" ON "public"."services" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));
CREATE POLICY "Services update admin" ON "public"."services" FOR UPDATE USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());
CREATE POLICY "Whatsapp sessions admin only" ON "public"."whatsapp_sessions" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());
CREATE POLICY "admin_read_app_config" ON "public"."app_config" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = ANY (ARRAY['dev'::"text", 'owner'::"text"])))));
CREATE POLICY "admins_delete_wa_messages" ON "public"."wa_messages" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = ANY (ARRAY['dev'::"text", 'owner'::"text"]))))));
CREATE POLICY "admins_read_wa_messages" ON "public"."wa_messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = ANY (ARRAY['dev'::"text", 'owner'::"text"]))))));
CREATE POLICY "admins_select_wa_action_debounce" ON "public"."wa_action_debounce" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = ANY (ARRAY['dev'::"text", 'owner'::"text"]))))));
CREATE POLICY "admins_select_wa_error_log" ON "public"."wa_error_log" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = ANY (ARRAY['dev'::"text", 'owner'::"text"]))))));
CREATE POLICY "admins_select_waba_intent_shadow_log" ON "public"."waba_intent_shadow_log" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = ANY (ARRAY['dev'::"text", 'owner'::"text"]))))));
ALTER TABLE "public"."ai_usage_log" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_usage_log_admin_select" ON "public"."ai_usage_log" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = ANY (ARRAY['dev'::"text", 'owner'::"text"]))))));
ALTER TABLE "public"."anthropic_billing_snapshots" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anthropic_billing_snapshots_admin_select" ON "public"."anthropic_billing_snapshots" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = ANY (ARRAY['dev'::"text", 'owner'::"text"]))))));
ALTER TABLE "public"."app_config" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."appointment_services" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."appointment_verifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."appointments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apt_svc_delete" ON "public"."appointment_services" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."appointments" "a"
  WHERE ((("a"."id")::"text" = ("appointment_services"."appointment_id")::"text") AND ("public"."is_admin"() OR (EXISTS ( SELECT 1
           FROM "public"."profiles" "p"
          WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = 'staff'::"text") AND ("p"."employee_id" IS NOT NULL) AND (("p"."employee_id")::"text" = ("a"."employee_id")::"text")))))))));
CREATE POLICY "apt_svc_insert" ON "public"."appointment_services" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."appointments" "a"
  WHERE ((("a"."id")::"text" = ("appointment_services"."appointment_id")::"text") AND ("public"."is_admin"() OR (EXISTS ( SELECT 1
           FROM "public"."profiles" "p"
          WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = 'staff'::"text") AND ("p"."employee_id" IS NOT NULL) AND (("p"."employee_id")::"text" = ("a"."employee_id")::"text")))))))));
CREATE POLICY "apt_svc_select" ON "public"."appointment_services" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "apt_svc_update" ON "public"."appointment_services" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."appointments" "a"
  WHERE ((("a"."id")::"text" = ("appointment_services"."appointment_id")::"text") AND ("public"."is_admin"() OR (EXISTS ( SELECT 1
           FROM "public"."profiles" "p"
          WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = 'staff'::"text") AND ("p"."employee_id" IS NOT NULL) AND (("p"."employee_id")::"text" = ("a"."employee_id")::"text"))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."appointments" "a"
  WHERE ((("a"."id")::"text" = ("appointment_services"."appointment_id")::"text") AND ("public"."is_admin"() OR (EXISTS ( SELECT 1
           FROM "public"."profiles" "p"
          WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = 'staff'::"text") AND ("p"."employee_id" IS NOT NULL) AND (("p"."employee_id")::"text" = ("a"."employee_id")::"text")))))))));
ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."employees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."inventory_items" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_dev_all" ON "public"."appointment_verifications" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = ANY (ARRAY['owner'::"text", 'dev'::"text"]))))));
ALTER TABLE "public"."packs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "packs_delete_admin" ON "public"."packs" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = ANY (ARRAY['dev'::"text", 'owner'::"text"]))))));
CREATE POLICY "packs_insert_admin" ON "public"."packs" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = ANY (ARRAY['dev'::"text", 'owner'::"text"]))))));
CREATE POLICY "packs_select" ON "public"."packs" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "packs_update_admin" ON "public"."packs" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = ANY (ARRAY['dev'::"text", 'owner'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = ANY (ARRAY['dev'::"text", 'owner'::"text"]))))));
ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."promo_broadcast_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."promo_broadcasts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."promotion_items" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promotion_items_delete_admin" ON "public"."promotion_items" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = ANY (ARRAY['dev'::"text", 'owner'::"text"]))))));
CREATE POLICY "promotion_items_insert_admin" ON "public"."promotion_items" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = ANY (ARRAY['dev'::"text", 'owner'::"text"]))))));
CREATE POLICY "promotion_items_select" ON "public"."promotion_items" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "promotion_items_update_admin" ON "public"."promotion_items" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = ANY (ARRAY['dev'::"text", 'owner'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = ANY (ARRAY['dev'::"text", 'owner'::"text"]))))));
ALTER TABLE "public"."promotions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promotions_delete_admin" ON "public"."promotions" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = ANY (ARRAY['owner'::"text", 'dev'::"text"]))))));
CREATE POLICY "promotions_insert_admin" ON "public"."promotions" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = ANY (ARRAY['owner'::"text", 'dev'::"text"]))))));
CREATE POLICY "promotions_read_all" ON "public"."promotions" FOR SELECT USING (true);
CREATE POLICY "promotions_update_admin" ON "public"."promotions" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = ANY (ARRAY['owner'::"text", 'dev'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = ANY (ARRAY['owner'::"text", 'dev'::"text"]))))));
ALTER TABLE "public"."push_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."salon_holidays" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."service_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."service_portfolio_images" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_portfolio_images_all_admin" ON "public"."service_portfolio_images" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = ANY (ARRAY['dev'::"text", 'owner'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = ANY (ARRAY['dev'::"text", 'owner'::"text"]))))));
CREATE POLICY "service_portfolio_images_select" ON "public"."service_portfolio_images" FOR SELECT TO "authenticated" USING (true);
ALTER TABLE "public"."services" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_token" ON "public"."push_tokens" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));
ALTER TABLE "public"."wa_action_debounce" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."wa_error_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."wa_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."waba_config" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "waba_config_admin_only" ON "public"."waba_config" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = ANY (ARRAY['dev'::"text", 'owner'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = ANY (ARRAY['dev'::"text", 'owner'::"text"]))))));
ALTER TABLE "public"."waba_intent_shadow_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."waba_pricing_daily" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "waba_pricing_daily_admin_select" ON "public"."waba_pricing_daily" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = ANY (ARRAY['dev'::"text", 'owner'::"text"]))))));
ALTER TABLE "public"."waba_pricing_sync_log" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "waba_pricing_sync_log_admin_select" ON "public"."waba_pricing_sync_log" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = ANY (ARRAY['dev'::"text", 'owner'::"text"]))))));
ALTER TABLE "public"."whatsapp_sessions" ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";
SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;
GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
REVOKE ALL ON FUNCTION "public"."get_top_completed_services"("p_status_since" timestamp with time zone, "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_top_completed_services"("p_status_since" timestamp with time zone, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_top_completed_services"("p_status_since" timestamp with time zone, "p_limit" integer) TO "service_role";
REVOKE ALL ON FUNCTION "public"."invoke_waba_pricing_sync"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."invoke_waba_pricing_sync"() TO "service_role";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";
GRANT ALL ON FUNCTION "public"."notify_appointment_assigned"() TO "service_role";
GRANT ALL ON FUNCTION "public"."reset_waba_session_after_app_booking"() TO "anon";
GRANT ALL ON FUNCTION "public"."reset_waba_session_after_app_booking"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_waba_session_after_app_booking"() TO "service_role";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";
GRANT ALL ON FUNCTION "public"."update_promotions_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_promotions_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_promotions_updated_at"() TO "service_role";
GRANT ALL ON FUNCTION "public"."wa_phone_variants"("raw_phone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."wa_phone_variants"("raw_phone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."wa_phone_variants"("raw_phone" "text") TO "service_role";
REVOKE ALL ON FUNCTION "public"."waba_claim_action_debounce"("p_phone" "text", "p_kind" "text", "p_window_seconds" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."waba_claim_action_debounce"("p_phone" "text", "p_kind" "text", "p_window_seconds" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."waba_claim_action_debounce"("p_phone" "text", "p_kind" "text", "p_window_seconds" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."waba_claim_action_debounce"("p_phone" "text", "p_kind" "text", "p_window_seconds" integer) TO "service_role";
REVOKE ALL ON FUNCTION "public"."waba_cleanup_action_debounce"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."waba_cleanup_action_debounce"() TO "anon";
GRANT ALL ON FUNCTION "public"."waba_cleanup_action_debounce"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."waba_cleanup_action_debounce"() TO "service_role";
GRANT ALL ON FUNCTION "public"."waba_find_ads_bounce_phones"("min_minutes" integer, "max_minutes" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."waba_find_ads_bounce_phones"("min_minutes" integer, "max_minutes" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."waba_find_ads_bounce_phones"("min_minutes" integer, "max_minutes" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."waba_find_idle_browse_phones"("min_minutes" integer, "max_minutes" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."waba_find_idle_browse_phones"("min_minutes" integer, "max_minutes" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."waba_find_idle_browse_phones"("min_minutes" integer, "max_minutes" integer) TO "service_role";
REVOKE ALL ON FUNCTION "public"."waba_find_quality_review_candidates"("min_age_minutes" integer, "max_age_minutes" integer, "max_rows" integer, "include_qa" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."waba_find_quality_review_candidates"("min_age_minutes" integer, "max_age_minutes" integer, "max_rows" integer, "include_qa" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."waba_find_quality_review_candidates"("min_age_minutes" integer, "max_age_minutes" integer, "max_rows" integer, "include_qa" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."waba_find_quality_review_candidates"("min_age_minutes" integer, "max_age_minutes" integer, "max_rows" integer, "include_qa" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."waba_find_silent_phones"("min_minutes" integer, "max_minutes" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."waba_find_silent_phones"("min_minutes" integer, "max_minutes" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."waba_find_silent_phones"("min_minutes" integer, "max_minutes" integer) TO "service_role";
REVOKE ALL ON FUNCTION "public"."waba_release_action_debounce"("p_phone" "text", "p_kind" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."waba_release_action_debounce"("p_phone" "text", "p_kind" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."waba_release_action_debounce"("p_phone" "text", "p_kind" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."waba_release_action_debounce"("p_phone" "text", "p_kind" "text") TO "service_role";
REVOKE ALL ON FUNCTION "public"."waba_release_phone_lock"("p_phone" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."waba_release_phone_lock"("p_phone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."waba_release_phone_lock"("p_phone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."waba_release_phone_lock"("p_phone" "text") TO "service_role";
REVOKE ALL ON FUNCTION "public"."waba_try_phone_lock"("p_phone" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."waba_try_phone_lock"("p_phone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."waba_try_phone_lock"("p_phone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."waba_try_phone_lock"("p_phone" "text") TO "service_role";
GRANT ALL ON TABLE "public"."ai_usage_log" TO "anon";
GRANT ALL ON TABLE "public"."ai_usage_log" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_usage_log" TO "service_role";
GRANT ALL ON TABLE "public"."anthropic_billing_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."anthropic_billing_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."anthropic_billing_snapshots" TO "service_role";
GRANT ALL ON TABLE "public"."app_config" TO "anon";
GRANT ALL ON TABLE "public"."app_config" TO "authenticated";
GRANT ALL ON TABLE "public"."app_config" TO "service_role";
GRANT ALL ON TABLE "public"."appointment_services" TO "anon";
GRANT ALL ON TABLE "public"."appointment_services" TO "authenticated";
GRANT ALL ON TABLE "public"."appointment_services" TO "service_role";
GRANT ALL ON TABLE "public"."appointment_verifications" TO "anon";
GRANT ALL ON TABLE "public"."appointment_verifications" TO "authenticated";
GRANT ALL ON TABLE "public"."appointment_verifications" TO "service_role";
GRANT ALL ON TABLE "public"."appointments" TO "anon";
GRANT ALL ON TABLE "public"."appointments" TO "authenticated";
GRANT ALL ON TABLE "public"."appointments" TO "service_role";
GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";
GRANT ALL ON TABLE "public"."employees" TO "anon";
GRANT ALL ON TABLE "public"."employees" TO "authenticated";
GRANT ALL ON TABLE "public"."employees" TO "service_role";
GRANT ALL ON TABLE "public"."inventory_items" TO "anon";
GRANT ALL ON TABLE "public"."inventory_items" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_items" TO "service_role";
GRANT ALL ON TABLE "public"."packs" TO "anon";
GRANT ALL ON TABLE "public"."packs" TO "authenticated";
GRANT ALL ON TABLE "public"."packs" TO "service_role";
GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";
GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";
GRANT ALL ON TABLE "public"."promo_broadcast_items" TO "anon";
GRANT ALL ON TABLE "public"."promo_broadcast_items" TO "authenticated";
GRANT ALL ON TABLE "public"."promo_broadcast_items" TO "service_role";
GRANT ALL ON TABLE "public"."promo_broadcasts" TO "anon";
GRANT ALL ON TABLE "public"."promo_broadcasts" TO "authenticated";
GRANT ALL ON TABLE "public"."promo_broadcasts" TO "service_role";
GRANT ALL ON TABLE "public"."promotion_items" TO "anon";
GRANT ALL ON TABLE "public"."promotion_items" TO "authenticated";
GRANT ALL ON TABLE "public"."promotion_items" TO "service_role";
GRANT ALL ON TABLE "public"."promotions" TO "anon";
GRANT ALL ON TABLE "public"."promotions" TO "authenticated";
GRANT ALL ON TABLE "public"."promotions" TO "service_role";
GRANT ALL ON TABLE "public"."push_tokens" TO "anon";
GRANT ALL ON TABLE "public"."push_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."push_tokens" TO "service_role";
GRANT ALL ON TABLE "public"."salon_holidays" TO "anon";
GRANT ALL ON TABLE "public"."salon_holidays" TO "authenticated";
GRANT ALL ON TABLE "public"."salon_holidays" TO "service_role";
GRANT ALL ON TABLE "public"."service_categories" TO "anon";
GRANT ALL ON TABLE "public"."service_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."service_categories" TO "service_role";
GRANT ALL ON TABLE "public"."service_portfolio_images" TO "anon";
GRANT ALL ON TABLE "public"."service_portfolio_images" TO "authenticated";
GRANT ALL ON TABLE "public"."service_portfolio_images" TO "service_role";
GRANT ALL ON TABLE "public"."services" TO "anon";
GRANT ALL ON TABLE "public"."services" TO "authenticated";
GRANT ALL ON TABLE "public"."services" TO "service_role";
GRANT ALL ON TABLE "public"."wa_action_debounce" TO "anon";
GRANT ALL ON TABLE "public"."wa_action_debounce" TO "authenticated";
GRANT ALL ON TABLE "public"."wa_action_debounce" TO "service_role";
GRANT ALL ON TABLE "public"."wa_error_log" TO "anon";
GRANT ALL ON TABLE "public"."wa_error_log" TO "authenticated";
GRANT ALL ON TABLE "public"."wa_error_log" TO "service_role";
GRANT ALL ON TABLE "public"."wa_messages" TO "anon";
GRANT ALL ON TABLE "public"."wa_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."wa_messages" TO "service_role";
GRANT ALL ON TABLE "public"."waba_config" TO "anon";
GRANT ALL ON TABLE "public"."waba_config" TO "authenticated";
GRANT ALL ON TABLE "public"."waba_config" TO "service_role";
GRANT ALL ON TABLE "public"."waba_intent_shadow_log" TO "anon";
GRANT ALL ON TABLE "public"."waba_intent_shadow_log" TO "authenticated";
GRANT ALL ON TABLE "public"."waba_intent_shadow_log" TO "service_role";
GRANT ALL ON TABLE "public"."waba_pricing_daily" TO "anon";
GRANT ALL ON TABLE "public"."waba_pricing_daily" TO "authenticated";
GRANT ALL ON TABLE "public"."waba_pricing_daily" TO "service_role";
GRANT ALL ON TABLE "public"."waba_pricing_sync_log" TO "anon";
GRANT ALL ON TABLE "public"."waba_pricing_sync_log" TO "authenticated";
GRANT ALL ON TABLE "public"."waba_pricing_sync_log" TO "service_role";
GRANT ALL ON TABLE "public"."whatsapp_sessions" TO "anon";
GRANT ALL ON TABLE "public"."whatsapp_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."whatsapp_sessions" TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
