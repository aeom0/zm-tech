import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useProfileTenantId } from '@/screens/finances/hooks/useProfileTenantId'
import type { ClienteSegmento, PromoBroadcast } from '../types'

interface CreateBroadcastInput {
  title: string
  bodyText: string
  imageUrl: string
  clients: ClienteSegmento[]
}

async function createBroadcastApi(
  input: CreateBroadcastInput,
  createdBy: string | null,
  tenantId: string
): Promise<PromoBroadcast> {
  const { title, bodyText, imageUrl, clients } = input

  const { data: broadcast, error: insertError } = await supabase
    .from('promo_broadcasts')
    .insert({
      title,
      template: 'promo_zm_v1',
      body_text: bodyText,
      image_url: imageUrl,
      created_by: createdBy,
      status: 'draft',
      tenant_id: tenantId,
    })
    .select('*')
    .single()

  if (insertError) {
    throw new Error(insertError.message)
  }

  const broadcastId = broadcast.id as string

  const itemsPayload = clients.map((c) => ({
    broadcast_id: broadcastId,
    client_id: c.id,
    client_name: c.name,
    phone: c.phone,
    tenant_id: tenantId,
  }))

  if (itemsPayload.length > 0) {
    const { error: itemsError } = await supabase.from('promo_broadcast_items').insert(itemsPayload)
    if (itemsError) {
      throw new Error(itemsError.message)
    }
  }

  return broadcast as PromoBroadcast
}

async function sendBroadcastApi(broadcastId: string) {
  const { data, error } = await supabase.functions.invoke('send-promo-whatsapp', {
    body: { broadcast_id: broadcastId },
  })

  if (error) {
    throw new Error(error.message ?? 'Error enviando promo')
  }

  return data as {
    broadcast_id: string
    total_sent: number
    total_failed: number
  }
}

async function pollBroadcastStatusApi(
  broadcastId: string,
  onTick?: (broadcast: PromoBroadcast) => void,
  waitForDraft = false
): Promise<PromoBroadcast> {
  return new Promise((resolve, reject) => {
    let cancelled = false
    const startedAt = Date.now()

    const tick = async () => {
      if (cancelled) return
      const { data, error } = await supabase.from('promo_broadcasts').select('*').eq('id', broadcastId).maybeSingle()

      if (error) {
        cancelled = true
        reject(error)
        return
      }

      if (!data) {
        cancelled = true
        reject(new Error('Broadcast no encontrado'))
        return
      }

      const broadcast = data as PromoBroadcast
      onTick?.(broadcast)

      const stillStarting = waitForDraft && broadcast.status === 'draft' && Date.now() - startedAt < 60_000

      if (broadcast.status === 'sending' || stillStarting) {
        setTimeout(tick, 2000)
      } else {
        cancelled = true
        resolve(broadcast)
      }
    }

    tick().catch(reject)
  })
}

export function usePromoBroadcast() {
  const { userId } = useAuth()
  const { tenantId } = useProfileTenantId()

  const createBroadcast = useMutation({
    mutationFn: (input: CreateBroadcastInput) => {
      if (!tenantId) {
        throw new Error('No se pudo resolver el tenant de la cuenta. Reintenta en unos segundos.')
      }
      return createBroadcastApi(input, userId ?? null, tenantId)
    },
  })

  const sendBroadcast = useMutation({
    mutationFn: (broadcastId: string) => sendBroadcastApi(broadcastId),
  })

  const pollBroadcastStatus = (
    broadcastId: string,
    onTick?: (broadcast: PromoBroadcast) => void,
    waitForDraft = false
  ) => pollBroadcastStatusApi(broadcastId, onTick, waitForDraft)

  return {
    createBroadcast,
    sendBroadcast,
    pollBroadcastStatus,
  }
}
