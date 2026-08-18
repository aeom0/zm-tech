import * as Updates from 'expo-updates'
import Constants from 'expo-constants'

interface AppInfo {
  appVersion: string
  runtimeVersion: string
  channel: string
  otaId: string | null
  otaShort: string | null
}

export function useAppInfo(): AppInfo {
  const appVersion = Constants.expoConfig?.version ?? '—'
  const runtimeVersion = (Updates as any).runtimeVersion ?? '—'
  const channel = (Updates as any).channel ?? 'development'
  const otaId = (Updates as any).updateId ?? null
  const otaShort = otaId ? otaId.slice(0, 8) : null

  return {
    appVersion,
    runtimeVersion,
    channel,
    otaId,
    otaShort,
  }
}
