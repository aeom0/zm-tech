'use client'

// Hook para consumir el endpoint GET /api/bcv/tasa.
// WEB-ONLY (Next.js) -- usa localStorage. NO importar desde React Native;
// mobile debe implementar su propio hook con AsyncStorage consumiendo
// solo los tipos/funciones puras de '@zmtech/tasas'.

import { useState, useEffect, useCallback } from 'react'
import { normalizarRespuestaTasaApi, type RespuestaTasaApi } from '../normalizarRespuesta'
import type { TasasDuales } from '../types'

const CACHE_KEY = 'zmtech_tasas_duales'
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 min

interface UseTasasDualesReturn {
  tasas: TasasDuales | null
  cargando: boolean
  error: string | null
  recargar: () => void
  sinUSDT: boolean
}

/**
 * @param endpoint Ruta del endpoint de tasas de la app consumidora (por defecto '/api/bcv/tasa').
 */
export function useTasasDuales(endpoint = '/api/bcv/tasa'): UseTasasDualesReturn {
  const [tasas, setTasas] = useState<TasasDuales | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)

    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) {
        const cached = JSON.parse(raw) as TasasDuales & { _cachedAt: number }
        if (Date.now() - cached._cachedAt < CACHE_TTL_MS) {
          setTasas(cached)
          setCargando(false)
          return
        }
      }
    } catch {
      /* cache corrupto -- ignorar */
    }

    try {
      const res = await fetch(endpoint, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Tasas API respondió ${res.status}`)
      const data: RespuestaTasaApi = await res.json()
      const resultado: TasasDuales = normalizarRespuestaTasaApi(data)

      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ...resultado, _cachedAt: Date.now() }))
      } catch {
        /* storage lleno -- ignorar */
      }

      setTasas(resultado)
    } catch (err) {
      setError('No se pudo obtener las tasas de cambio')
      console.error('[useTasasDuales]', err)
    } finally {
      setCargando(false)
    }
  }, [endpoint])

  useEffect(() => {
    cargar()
  }, [cargar])

  return {
    tasas,
    cargando,
    error,
    recargar: cargar,
    sinUSDT: !tasas?.usdt.disponible,
  }
}
