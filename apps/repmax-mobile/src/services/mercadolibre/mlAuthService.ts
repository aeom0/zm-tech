// ============================================================
// OAuth MercadoLibre — status + iniciar sesión + desconectar
// Tokens nunca se leen en el cliente (columnas omitidas en el select).
// ============================================================
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'

import { supabase } from '../../utils/supabase'
import type { MlConnectionUiStatus, RepmaxMlConnection } from '@repmax/repmax-schema/mlConnection'

WebBrowser.maybeCompleteAuthSession()

const DEEP_LINK_RETURN = 'repmax://ml-connected'

const STATUS_COLUMNS =
  'id, store_id, ml_user_id, site_id, status, expires_at, connected_by, connected_at, updated_at'

interface ConnectionRow {
  id: string
  store_id: string
  ml_user_id: number
  site_id: string
  status: 'active' | 'expired' | 'revoked'
  expires_at: string
  connected_by: string | null
  connected_at: string
  updated_at: string
}

function mapConnection(row: ConnectionRow): RepmaxMlConnection {
  return {
    id: row.id,
    storeId: row.store_id,
    mlUserId: row.ml_user_id,
    siteId: row.site_id,
    status: row.status,
    expiresAt: row.expires_at,
    connectedBy: row.connected_by,
    connectedAt: row.connected_at,
    updatedAt: row.updated_at,
  }
}

function uiDesdeFila(row: RepmaxMlConnection): MlConnectionUiStatus {
  if (row.status === 'revoked') return 'disconnected'
  if (row.status === 'expired') return 'expired'
  const vence = new Date(row.expiresAt).getTime()
  if (Number.isFinite(vence) && vence <= Date.now()) return 'expired'
  return 'connected'
}

function mensajeFn(data: unknown, fallback: string): string {
  if (data && typeof data === 'object' && 'error' in data) {
    const err = (data as { error: unknown }).error
    if (typeof err === 'string' && err.trim()) return err
  }
  return fallback
}

function statusDesdeDeepLink(url: string): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('No se pudo leer el retorno de MercadoLibre.')
  }
  const status = parsed.searchParams.get('status')
  if (status === 'success') return
  throw new Error(
    parsed.searchParams.get('message') ?? 'No se completó la conexión con MercadoLibre.'
  )
}

/** Listener temporal: getInitialURL() solo sirve en cold start; OAuth vuelve con la app en memoria. */
function crearEsperaDeepLinkOauth(timeoutMs = 8000): {
  promise: Promise<string>
  cleanup: () => void
} {
  let subscription: { remove: () => void } | undefined
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  let settled = false

  const cleanup = () => {
    subscription?.remove()
    if (timeoutId) clearTimeout(timeoutId)
  }

  const promise = new Promise<string>((resolve, reject) => {
    subscription = Linking.addEventListener('url', ({ url }) => {
      if (!url.startsWith(DEEP_LINK_RETURN)) return
      if (settled) return
      settled = true
      resolve(url)
    })

    timeoutId = setTimeout(() => {
      if (settled) return
      settled = true
      reject(new Error('No se completó la conexión con MercadoLibre.'))
    }, timeoutMs)
  })

  return { promise, cleanup }
}

export interface MlConnectionSnapshot {
  uiStatus: MlConnectionUiStatus
  connection: RepmaxMlConnection | null
}

export const mlAuthService = {
  async getConnectionStatus(storeId: string): Promise<MlConnectionSnapshot> {
    const { data, error } = await supabase
      .from('repmax_ml_connections')
      .select(STATUS_COLUMNS)
      .eq('store_id', storeId)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!data) return { uiStatus: 'disconnected', connection: null }

    const connection = mapConnection(data as ConnectionRow)
    return { uiStatus: uiDesdeFila(connection), connection }
  },

  async startConnection(storeId: string): Promise<MlConnectionSnapshot> {
    const { data, error } = await supabase.functions.invoke('ml-oauth-start', {
      body: { storeId },
    })
    if (error) {
      throw new Error(mensajeFn(data, error.message || 'No se pudo abrir MercadoLibre.'))
    }
    const authUrl = (data as { authUrl?: string } | null)?.authUrl
    if (!authUrl) throw new Error('No recibimos la URL de MercadoLibre.')

    const esperaDeepLink = crearEsperaDeepLinkOauth(8000)

    try {
      const result = await WebBrowser.openAuthSessionAsync(authUrl, DEEP_LINK_RETURN)

      if (result.type === 'cancel' || result.type === 'dismiss') {
        throw new Error('Conexión cancelada.')
      }

      const returnUrl =
        result.type === 'success' && 'url' in result && result.url
          ? result.url
          : await esperaDeepLink.promise

      statusDesdeDeepLink(returnUrl)
      return this.getConnectionStatus(storeId)
    } finally {
      esperaDeepLink.cleanup()
    }
  },

  async disconnect(storeId: string): Promise<void> {
    const { error } = await supabase.from('repmax_ml_connections').delete().eq('store_id', storeId)
    if (error) throw new Error(error.message)
  },
}
