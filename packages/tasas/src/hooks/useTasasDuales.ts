'use client'

// Hook para consumir el endpoint GET /api/bcv/tasa.
// WEB-ONLY (Next.js) -- usa localStorage. NO importar desde React Native;
// mobile debe implementar su propio hook con AsyncStorage consumiendo
// solo los tipos/funciones puras de '@zmtech/tasas'.

import { useState, useEffect, useCallback } from 'react'
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

interface RespuestaTasaApi {
  usd?: number
  fecha?: string
  fuente?: string
  tasas?: {
    bcv: { valor: number | null; fuente: string; disponible: boolean; esReferencial?: boolean }
    usdt: { valor: number | null; fuente: string; disponible: boolean }
    spread?: TasasDuales['spread']
  }
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
      const data: RespuestaTasaApi = await res.json()
      const ahora = new Date().toISOString()
      const fecha = data.fecha ?? new Date().toISOString().split('T')[0]

      const bcvValor = data.tasas?.bcv.valor ?? data.usd ?? 0
      const bcvFuente = data.tasas?.bcv.fuente ?? data.fuente ?? 'sin-datos'
      const bcvDisponible = data.tasas?.bcv.disponible ?? bcvValor > 0
      const usdtValor = data.tasas?.usdt.valor ?? null
      const usdtDisponible = data.tasas?.usdt.disponible ?? false

      const resultado: TasasDuales = {
        bcv: {
          valor: bcvValor,
          fecha,
          fuente: bcvFuente,
          disponible: bcvDisponible,
          esReferencial: data.tasas?.bcv.esReferencial ?? false,
          ultimaActualizacion: ahora,
        },
        usdt: {
          valor: usdtDisponible && usdtValor ? usdtValor : bcvValor,
          fecha,
          fuente: usdtDisponible ? (data.tasas?.usdt.fuente ?? 'usdt.com.ve') : 'fallback-bcv',
          disponible: usdtDisponible,
          esReferencial: !usdtDisponible,
          ultimaActualizacion: ahora,
        },
        spread: data.tasas?.spread ?? { absoluto: 0, porcentaje: 0, nivel: 'bajo' },
        timestamp: Date.now(),
      }

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
