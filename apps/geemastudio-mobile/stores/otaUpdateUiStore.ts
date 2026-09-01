// stores/otaUpdateUiStore.ts
// Estado UI del proceso OTA (sin Zustand — useSyncExternalStore)

import { useSyncExternalStore } from 'react'

export type OtaFase = 'idle' | 'buscando' | 'descargando' | 'instalando' | 'reiniciando'

export interface OtaUpdateUiState {
  /** Overlay visible */
  visible: boolean
  /** Fase actual del proceso */
  fase: OtaFase
  /** Progreso visual 0–100 */
  progreso: number
  /** Mensaje custom (override del mensaje por fase) */
  mensajeCustom: string | null
  /**
   * true cuando el chequeo/aplicación OTA terminó (o no aplica).
   * AuthGate espera esto antes de salir del splash.
   */
  listo: boolean
}

type Listener = () => void

const ESTADO_INICIAL: OtaUpdateUiState = {
  visible: false,
  fase: 'idle',
  progreso: 0,
  mensajeCustom: null,
  listo: typeof __DEV__ !== 'undefined' ? __DEV__ : false,
}

let estado: OtaUpdateUiState = { ...ESTADO_INICIAL }
const listeners = new Set<Listener>()

function emit() {
  listeners.forEach((l) => l())
}

function setEstado(parcial: Partial<OtaUpdateUiState>) {
  estado = { ...estado, ...parcial }
  emit()
}

export const otaUpdateUiStore = {
  getState: (): OtaUpdateUiState => estado,

  subscribe: (listener: Listener): (() => void) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  mostrarOverlay: (fase: OtaFase) => setEstado({ visible: true, fase, mensajeCustom: null }),

  ocultarOverlay: () => setEstado({ visible: false }),

  setFase: (fase: OtaFase) => setEstado({ fase }),

  setProgreso: (progreso: number) =>
    setEstado({ progreso: Math.min(100, Math.max(0, progreso)) }),

  setMensajeCustom: (mensajeCustom: string | null) => setEstado({ mensajeCustom }),

  marcarListo: () => setEstado({ listo: true }),

  resetStore: () => {
    estado = {
      ...ESTADO_INICIAL,
      listo: estado.listo,
    }
    emit()
  },
}

/** Hook: suscribe a todo el estado OTA UI */
export function useOtaUpdateUiStore(): OtaUpdateUiState {
  return useSyncExternalStore(
    otaUpdateUiStore.subscribe,
    otaUpdateUiStore.getState,
    otaUpdateUiStore.getState
  )
}

/** Hook: selector simple (evita re-renders innecesarios en AuthGate) */
export function useOtaUpdateUiSelector<T>(selector: (s: OtaUpdateUiState) => T): T {
  return useSyncExternalStore(
    otaUpdateUiStore.subscribe,
    () => selector(otaUpdateUiStore.getState()),
    () => selector(otaUpdateUiStore.getState())
  )
}
