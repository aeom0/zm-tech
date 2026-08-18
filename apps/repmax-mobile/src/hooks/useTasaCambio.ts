// Tasa BCV/USDT en vivo para RepMAX mobile. Lee directo de las tablas
// hub_tasas_bcv/hub_tasas_usdt (RLS: SELECT público) — sin pasar por
// '@zmtech/tasas/server' (Node-only, no válido en React Native).
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../utils/supabase';
import {
  ahoraVenezuela,
  calcularSpreadInfo,
  obtenerFechaReferenciaBCV,
  type TasasDuales,
} from '@zmtech/tasas';

const CACHE_KEY = 'zmtech_tasas_duales_mobile';
const CACHE_TTL_MS = 30 * 60 * 1000;

async function resolverTasasDesdeSupabase(): Promise<TasasDuales | null> {
  const hoy = ahoraVenezuela().format('YYYY-MM-DD');
  const fechaRef = obtenerFechaReferenciaBCV(hoy);

  const { data: filaBcv } = await supabase
    .from('hub_tasas_bcv')
    .select('fecha, usd, fuente')
    .lte('fecha', fechaRef)
    .gt('usd', 0)
    .neq('fuente', 'emergencia')
    .order('fecha', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!filaBcv) return null;

  const { data: filaUsdt } = await supabase
    .from('hub_tasas_usdt')
    .select('fecha, usd, fuente')
    .eq('mercado', 'binance')
    .lte('fecha', filaBcv.fecha as string)
    .order('fecha', { ascending: false })
    .limit(1)
    .maybeSingle();

  const bcvValor = parseFloat(String(filaBcv.usd));
  const bcv = {
    valor: bcvValor,
    fecha: filaBcv.fecha as string,
    fuente: (filaBcv.fuente as string) ?? 'bcv-oficial',
    disponible: true,
    esReferencial: filaBcv.fecha !== fechaRef,
    ultimaActualizacion: new Date().toISOString(),
  };

  const usdt = filaUsdt
    ? {
        valor: parseFloat(String(filaUsdt.usd)),
        fecha: filaUsdt.fecha as string,
        fuente: (filaUsdt.fuente as string) ?? 'usdt.com.ve',
        disponible: true,
        esReferencial: filaUsdt.fecha !== bcv.fecha,
        ultimaActualizacion: new Date().toISOString(),
      }
    : {
        valor: bcvValor,
        fecha: bcv.fecha,
        fuente: 'sin-tasa',
        disponible: false,
        esReferencial: true,
        ultimaActualizacion: new Date().toISOString(),
      };

  return {
    bcv,
    usdt,
    spread: calcularSpreadInfo(bcv.valor, usdt.valor),
    timestamp: Date.now(),
  };
}

interface UseTasaCambioResult {
  tasas: TasasDuales | null;
  /** Tasa a usar en checkout: la BCV en vivo, o `tasaManual` si usarTasaManual o si no hay datos. */
  usdBsRateEfectivo: number;
  isLoading: boolean;
  refrescar: () => Promise<void>;
}

export function useTasaCambio(
  tasaManual: number,
  usarTasaManual: boolean,
): UseTasaCambioResult {
  const [tasas, setTasas] = useState<TasasDuales | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const cargar = useCallback(
    async (forzar = false) => {
      setIsLoading(true);
      try {
        if (!forzar) {
          const cacheRaw = await AsyncStorage.getItem(CACHE_KEY);
          if (cacheRaw) {
            const cached = JSON.parse(cacheRaw) as TasasDuales;
            if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
              setTasas(cached);
              return;
            }
          }
        }
        const frescas = await resolverTasasDesdeSupabase();
        if (frescas) {
          setTasas(frescas);
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(frescas));
        }
      } catch {
        // Silencioso: el caller cae a tasaManual.
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const usdBsRateEfectivo =
    !usarTasaManual && tasas?.bcv.disponible ? tasas.bcv.valor : tasaManual;

  return {
    tasas,
    usdBsRateEfectivo,
    isLoading,
    refrescar: () => cargar(true),
  };
}
