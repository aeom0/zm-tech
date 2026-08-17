-- RPC idempotente: siembra 6 productos base según vehicle_focus de la tienda.
-- Pensada para llamarse una vez, justo después de crear la tienda en el
-- onboarding real (AuthContext.register()). Si la tienda ya tiene productos,
-- no hace nada — seguro de reintentar.
-- Hub: llacowjutjfefboqgfnj. Prefijo repmax_*. Sin fotos a propósito
-- (el dueño sube reales desde el flujo de captura).

CREATE OR REPLACE FUNCTION public.repmax_seed_starter_catalog(p_store_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_focus     text;
  v_existing  integer;
  v_inserted  integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.repmax_store_users
    WHERE user_id = auth.uid()
      AND store_id = p_store_id
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Sin acceso a esta tienda';
  END IF;

  -- Bloquea la tienda para que dos llamadas concurrentes no siembren 12.
  SELECT vehicle_focus INTO v_focus
  FROM public.repmax_stores
  WHERE id = p_store_id
  FOR UPDATE;

  IF v_focus IS NULL THEN
    RAISE EXCEPTION 'Tienda % no encontrada', p_store_id;
  END IF;

  SELECT count(*) INTO v_existing
  FROM public.repmax_products
  WHERE store_id = p_store_id;

  IF v_existing > 0 THEN
    -- Idempotencia: ya tiene catálogo (starter o real), no se siembra de nuevo.
    RETURN 0;
  END IF;

  -- ── Carros (CARS) ─────────────────────────────────────────
  IF v_focus = 'CARS' THEN
    INSERT INTO public.repmax_products
      (store_id, title, brand, model, vehicle_type, condition, part_number, price_usd, stock, min_stock)
    VALUES
      (p_store_id, 'Filtro de aceite', 'Toyota', 'Corolla', 'CAR'::repmax_vehicle_type, 'NEW'::repmax_part_condition, 'FA-COR-001', 8.50, 10, 2),
      (p_store_id, 'Pastillas de freno delanteras', 'Chevrolet', 'Aveo', 'CAR'::repmax_vehicle_type, 'NEW'::repmax_part_condition, 'PF-AVE-001', 22.00, 6, 2),
      (p_store_id, 'Bujía NGK', 'Genérico', 'Universal', 'CAR'::repmax_vehicle_type, 'NEW'::repmax_part_condition, 'BJ-NGK-001', 5.00, 20, 5),
      (p_store_id, 'Correa de distribución', 'Hyundai', 'Accent', 'CAR'::repmax_vehicle_type, 'NEW'::repmax_part_condition, 'CD-ACC-001', 35.00, 4, 1),
      (p_store_id, 'Amortiguador delantero', 'Nissan', 'Sentra', 'CAR'::repmax_vehicle_type, 'NEW'::repmax_part_condition, 'AM-SEN-001', 48.00, 4, 1),
      (p_store_id, 'Batería 12V 45Ah', 'Genérico', 'Universal', 'CAR'::repmax_vehicle_type, 'NEW'::repmax_part_condition, 'BAT-45A-001', 65.00, 3, 1);
    v_inserted := 6;

  ELSIF v_focus = 'MOTOS' THEN
    INSERT INTO public.repmax_products
      (store_id, title, brand, model, vehicle_type, condition, part_number, price_usd, stock, min_stock)
    VALUES
      (p_store_id, 'Kit de arrastre (cadena y piñones)', 'Empire Keeway', 'Universal', 'MOTO'::repmax_vehicle_type, 'NEW'::repmax_part_condition, 'KA-EK-001', 18.00, 8, 2),
      (p_store_id, 'Pastillas de freno', 'Bera', 'Universal', 'MOTO'::repmax_vehicle_type, 'NEW'::repmax_part_condition, 'PF-BER-001', 6.50, 12, 3),
      (p_store_id, 'Bujía', 'Suzuki', 'Universal', 'MOTO'::repmax_vehicle_type, 'NEW'::repmax_part_condition, 'BJ-SUZ-001', 3.50, 25, 5),
      (p_store_id, 'Filtro de aire', 'Empire Keeway', 'Universal', 'MOTO'::repmax_vehicle_type, 'NEW'::repmax_part_condition, 'FA-EK-001', 4.50, 15, 3),
      (p_store_id, 'Cámara de rueda', 'Genérico', 'Universal', 'MOTO'::repmax_vehicle_type, 'NEW'::repmax_part_condition, 'CAM-R18-001', 7.00, 10, 2),
      (p_store_id, 'Aceite de motor 4T (1L)', 'Genérico', 'Universal', 'MOTO'::repmax_vehicle_type, 'NEW'::repmax_part_condition, 'ACT-4T1L-001', 6.00, 20, 5);
    v_inserted := 6;

  ELSIF v_focus = 'BOTH' THEN
    INSERT INTO public.repmax_products
      (store_id, title, brand, model, vehicle_type, condition, part_number, price_usd, stock, min_stock)
    VALUES
      (p_store_id, 'Filtro de aceite', 'Toyota', 'Corolla', 'CAR'::repmax_vehicle_type, 'NEW'::repmax_part_condition, 'FA-COR-001', 8.50, 10, 2),
      (p_store_id, 'Pastillas de freno delanteras', 'Chevrolet', 'Aveo', 'CAR'::repmax_vehicle_type, 'NEW'::repmax_part_condition, 'PF-AVE-001', 22.00, 6, 2),
      (p_store_id, 'Bujía NGK', 'Genérico', 'Universal', 'CAR'::repmax_vehicle_type, 'NEW'::repmax_part_condition, 'BJ-NGK-001', 5.00, 20, 5),
      (p_store_id, 'Kit de arrastre (cadena y piñones)', 'Empire Keeway', 'Universal', 'MOTO'::repmax_vehicle_type, 'NEW'::repmax_part_condition, 'KA-EK-001', 18.00, 8, 2),
      (p_store_id, 'Pastillas de freno', 'Bera', 'Universal', 'MOTO'::repmax_vehicle_type, 'NEW'::repmax_part_condition, 'PF-BER-001', 6.50, 12, 3),
      (p_store_id, 'Bujía', 'Suzuki', 'Universal', 'MOTO'::repmax_vehicle_type, 'NEW'::repmax_part_condition, 'BJ-SUZ-001', 3.50, 25, 5);
    v_inserted := 6;

  ELSE
    RAISE EXCEPTION 'vehicle_focus % no soportado', v_focus;
  END IF;

  RETURN v_inserted;
END;
$function$;

COMMENT ON FUNCTION public.repmax_seed_starter_catalog(uuid) IS
  'Siembra 6 productos starter por vehicle_focus. Idempotente. Sin fotos.';

REVOKE ALL ON FUNCTION public.repmax_seed_starter_catalog(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.repmax_seed_starter_catalog(uuid) TO authenticated, service_role;
