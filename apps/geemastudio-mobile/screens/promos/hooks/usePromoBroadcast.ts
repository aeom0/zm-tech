import { useMutation } from '@tanstack/react-query'
import {
  createPromoBroadcast,
  sendPromoBroadcast,
  waitForPromoBroadcast,
} from '@geemastudio/data'
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

export function usePromoBroadcast() {
  const { userId } = useAuth()
  const { tenantId } = useProfileTenantId()

  const createBroadcast = useMutation({
    mutationFn: (input: CreateBroadcastInput) => {
      if (!tenantId) {
        throw new Error('No se pudo resolver el tenant de la cuenta. Reintenta en unos segundos.')
      }
      return createPromoBroadcast(supabase, {
        tenantId,
        createdBy: userId ?? null,
        title: input.title,
        bodyText: input.bodyText,
        imageUrl: input.imageUrl,
        recipients: input.clients,
      })
    },
  })

  const sendBroadcast = useMutation({
    mutationFn: (broadcastId: string) => sendPromoBroadcast(supabase, broadcastId),
  })

  const pollBroadcastStatus = (
    broadcastId: string,
    onTick?: (broadcast: PromoBroadcast) => void,
    waitForDraft = false
  ) => waitForPromoBroadcast(supabase, broadcastId, { onTick, waitForDraft })

  return {
    createBroadcast,
    sendBroadcast,
    pollBroadcastStatus,
  }
}
