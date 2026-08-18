// ============================================================
// Coordinador OAuth MercadoLibre.
// El screen solo renderiza: status + connect()/disconnect().
// ============================================================
import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '../context/AuthContext'
import { mlAuthService } from '../services/mercadolibre/mlAuthService'
import type { MlConnectionUiStatus, RepmaxMlConnection } from '@repmax/repmax-schema/mlConnection'

export function useMercadoLibreConnection() {
  const { store, storeUser } = useAuth()
  const storeId = store?.id
  const plan = store?.plan ?? 'basic'
  const isOwner = storeUser?.role === 'owner'
  const planPermiteMl = plan !== 'basic'

  const [status, setStatus] = useState<MlConnectionUiStatus>('disconnected')
  const [connection, setConnection] = useState<RepmaxMlConnection | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(storeId))

  const refresh = useCallback(async () => {
    if (!storeId) {
      setStatus('disconnected')
      setConnection(null)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const snap = await mlAuthService.getConnectionStatus(storeId)
      setConnection(snap.connection)
      setStatus(snap.uiStatus)
      setError(null)
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'No se pudo leer la conexión ML.')
    } finally {
      setIsLoading(false)
    }
  }, [storeId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const connect = useCallback(async () => {
    if (!storeId) {
      setStatus('error')
      setError('No encontramos tu tienda.')
      return
    }
    if (!isOwner) {
      setStatus('error')
      setError('Solo el dueño puede conectar MercadoLibre.')
      return
    }
    if (!planPermiteMl) {
      setStatus('error')
      setError('MercadoLibre entra en el plan Pro.')
      return
    }

    setStatus('connecting')
    setError(null)
    try {
      const snap = await mlAuthService.startConnection(storeId)
      setConnection(snap.connection)
      setStatus(snap.uiStatus)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo conectar MercadoLibre.'
      if (message === 'Conexión cancelada.') {
        await refresh()
        return
      }
      setStatus('error')
      setError(message)
    }
  }, [storeId, isOwner, planPermiteMl, refresh])

  const disconnect = useCallback(async () => {
    if (!storeId) return
    try {
      await mlAuthService.disconnect(storeId)
      setConnection(null)
      setStatus('disconnected')
      setError(null)
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'No se pudo desconectar MercadoLibre.')
    }
  }, [storeId])

  return {
    status,
    connection,
    error,
    isLoading,
    isOwner,
    planPermiteMl,
    isConnected: status === 'connected',
    connect,
    disconnect,
    refresh,
  }
}
