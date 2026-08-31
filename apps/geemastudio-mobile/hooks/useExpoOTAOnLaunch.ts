// hooks/useExpoOTAOnLaunch.ts
// Chequea OTA al abrir la app; si hay update, muestra OtaUpdateOverlay y recarga.

import { useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Updates from 'expo-updates'
import type { ReloadScreenOptions } from 'expo-updates'

import { Onboarding } from '@/constants/theme'
import { otaUpdateUiStore } from '@/stores/otaUpdateUiStore'

/** Tras reloadAsync, mostrar «Aplicando cambios…» en el nuevo bundle */
export const OTA_POST_RELOAD_KEY = '@geema/ota_post_reload_overlay'

const MS_PANTALLA_INSTALANDO = 2500
const OTA_CHECK_TIMEOUT_MS = 5000

/**
 * Pantalla nativa durante reloadAsync (SDK 54+).
 * Sin esto, Expo muestra fondo blanco + spinner por defecto.
 */
export const OTA_RELOAD_SCREEN: ReloadScreenOptions = {
  backgroundColor: Onboarding.canvasBackground,
  image: require('@/assets/splash-logo.png'),
  imageResizeMode: 'contain',
  fade: true,
  spinner: { enabled: false },
}

/**
 * Lee el flag post-reload lo antes posible (antes del primer paint)
 * para que el overlay cubra el remount sin flash de Login/onboarding.
 */
const postReloadWarmup: Promise<string | null> = __DEV__
  ? Promise.resolve(null)
  : AsyncStorage.getItem(OTA_POST_RELOAD_KEY).then((v) => {
      if (v === '1') {
        otaUpdateUiStore.mostrarOverlay('reiniciando')
        otaUpdateUiStore.setProgreso(95)
      }
      return v
    })

async function reloadConPantallaMarca(): Promise<void> {
  await Updates.reloadAsync({ reloadScreenOptions: OTA_RELOAD_SCREEN })
}

/**
 * EAS Update (OTA) al arranque en builds de producción.
 * La UI la controla OtaUpdateOverlay vía otaUpdateUiStore.
 * Marca `listo` para que AuthGate pueda salir del splash.
 */
export function useExpoOTAOnLaunch(): void {
  useEffect(() => {
    if (__DEV__) {
      otaUpdateUiStore.marcarListo()
      return
    }

    let cancelado = false
    const {
      mostrarOverlay,
      setFase,
      setProgreso,
      ocultarOverlay,
      resetStore,
      marcarListo,
    } = otaUpdateUiStore

    const ejecutar = async () => {
      let intervalDescarga: ReturnType<typeof setInterval> | null = null
      try {
        if (!Updates.isEnabled) {
          marcarListo()
          return
        }

        const postReload = await postReloadWarmup
        if (postReload === '1') {
          if (cancelado) return
          mostrarOverlay('reiniciando')
          setProgreso(95)
          await new Promise<void>((resolve) => {
            setTimeout(resolve, MS_PANTALLA_INSTALANDO)
          })
          await AsyncStorage.removeItem(OTA_POST_RELOAD_KEY)
          if (cancelado) {
            resetStore()
            marcarListo()
            return
          }
          setProgreso(100)
          await new Promise<void>((resolve) => setTimeout(resolve, 600))
          ocultarOverlay()
          resetStore()
          marcarListo()
          return
        }

        const chequeo = await Promise.race([
          Updates.checkForUpdateAsync(),
          new Promise<{ isAvailable: false }>((resolve) =>
            setTimeout(() => resolve({ isAvailable: false }), OTA_CHECK_TIMEOUT_MS)
          ),
        ])

        if (cancelado) return

        if (!chequeo?.isAvailable) {
          marcarListo()
          return
        }

        mostrarOverlay('descargando')
        setProgreso(15)

        intervalDescarga = setInterval(() => {
          const { progreso } = otaUpdateUiStore.getState()
          if (progreso < 70) setProgreso(progreso + 5)
        }, 300)

        await Updates.fetchUpdateAsync()
        clearInterval(intervalDescarga)
        intervalDescarga = null
        setProgreso(75)

        if (cancelado) {
          resetStore()
          marcarListo()
          return
        }

        setFase('instalando')
        setProgreso(75)
        await new Promise<void>((resolve) => {
          setTimeout(resolve, MS_PANTALLA_INSTALANDO)
        })
        setProgreso(95)

        if (cancelado) {
          resetStore()
          marcarListo()
          return
        }

        await AsyncStorage.setItem(OTA_POST_RELOAD_KEY, '1')
        await reloadConPantallaMarca()
      } catch {
        try {
          if (intervalDescarga) clearInterval(intervalDescarga)
        } catch {
          /* ignore */
        }
        ocultarOverlay()
        resetStore()
        try {
          await AsyncStorage.removeItem(OTA_POST_RELOAD_KEY)
        } catch {
          /* ignore */
        }
        marcarListo()
      } finally {
        if (intervalDescarga) clearInterval(intervalDescarga)
      }
    }

    void ejecutar()

    const safety = setTimeout(() => {
      const s = otaUpdateUiStore.getState()
      if (!s.listo && !s.visible) {
        otaUpdateUiStore.marcarListo()
      }
    }, OTA_CHECK_TIMEOUT_MS + 1500)

    return () => {
      cancelado = true
      clearTimeout(safety)
    }
  }, [])
}

/**
 * Flujo OTA manual (Configuración): muestra el mismo overlay y recarga.
 */
export async function applyOtaUpdateManual(): Promise<'up-to-date' | 'error' | 'reloading'> {
  if (__DEV__) {
    return 'up-to-date'
  }

  const { mostrarOverlay, setFase, setProgreso, ocultarOverlay, resetStore } = otaUpdateUiStore

  let intervalDescarga: ReturnType<typeof setInterval> | null = null

  try {
    if (!Updates.isEnabled) {
      return 'up-to-date'
    }

    mostrarOverlay('buscando')
    setProgreso(5)

    const chequeo = await Updates.checkForUpdateAsync()
    if (!chequeo.isAvailable) {
      ocultarOverlay()
      resetStore()
      return 'up-to-date'
    }

    setFase('descargando')
    setProgreso(15)
    intervalDescarga = setInterval(() => {
      const { progreso } = otaUpdateUiStore.getState()
      if (progreso < 70) setProgreso(progreso + 5)
    }, 300)

    await Updates.fetchUpdateAsync()
    clearInterval(intervalDescarga)
    intervalDescarga = null
    setProgreso(75)

    setFase('instalando')
    await new Promise<void>((resolve) => {
      setTimeout(resolve, MS_PANTALLA_INSTALANDO)
    })
    setProgreso(95)

    await AsyncStorage.setItem(OTA_POST_RELOAD_KEY, '1')
    await reloadConPantallaMarca()
    return 'reloading'
  } catch {
    try {
      if (intervalDescarga) clearInterval(intervalDescarga)
    } catch {
      /* ignore */
    }
    ocultarOverlay()
    resetStore()
    return 'error'
  } finally {
    if (intervalDescarga) clearInterval(intervalDescarga)
  }
}
