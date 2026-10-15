'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createPromoBroadcast,
  deletePromoBroadcast,
  fetchPromoSegment,
  listFailedPromoItems,
  listPromoBroadcasts,
  queryKeys,
  sendPromoBroadcast,
  uploadPromoImage,
  waitForPromoBroadcast,
  type PromoBroadcast,
  type PromoBroadcastItem,
  type PromoRecipient,
} from '@geemastudio/data'
import { zonaIANASegura } from '@zmtech/tenant-config'

import { useAuth } from '@/contexts/AuthContext'
import { useTenantSettings } from '@/hooks/configuracion/useTenantSettings'
import { supabase } from '@/lib/supabase'

function requireClient() {
  if (!supabase) throw new Error('No se pudo conectar. Intenta de nuevo.')
  return supabase
}

/** Clientas candidatas, sin bloqueadas ni bajas (STOP). */
export function usePromoSegment(categoryName: string | null, inactiveOnly: boolean) {
  const { profile, isAdmin } = useAuth()
  const { data: settings } = useTenantSettings()
  const tenantId = profile?.tenant_id ?? null
  const timeZone = zonaIANASegura(settings?.timezone)

  return useQuery({
    queryKey: queryKeys.promos.segment(tenantId, timeZone, categoryName, inactiveOnly),
    enabled: !!supabase && !!tenantId && isAdmin,
    staleTime: 5 * 60_000,
    queryFn: () =>
      fetchPromoSegment(requireClient(), {
        tenantId: tenantId as string,
        timeZone,
        categoryName,
        inactiveOnly,
      }),
  })
}

export function usePromoHistory() {
  const { profile, isAdmin } = useAuth()
  const tenantId = profile?.tenant_id ?? null
  return useQuery({
    queryKey: queryKeys.promos.history(tenantId),
    enabled: !!supabase && !!tenantId && isAdmin,
    queryFn: () => listPromoBroadcasts(requireClient(), tenantId as string),
  })
}

export function useUploadPromoImage() {
  const { profile } = useAuth()
  return useMutation({
    mutationFn: (file: File) => {
      const tenantId = profile?.tenant_id
      if (!tenantId) throw new Error('No se pudo resolver el negocio')
      const ext = file.name.split('.').pop()?.toLowerCase()
      return uploadPromoImage(requireClient(), {
        tenantId,
        body: file,
        contentType: file.type || 'image/jpeg',
        extension: ext && /^(jpe?g|png|webp)$/.test(ext) ? ext : 'jpg',
      })
    },
  })
}

export interface PromoSendInput {
  title: string
  bodyText: string
  imageUrl: string
  recipients: PromoRecipient[]
}

export interface PromoSendOutcome {
  broadcast: PromoBroadcast
  failedItems: PromoBroadcastItem[]
}

/**
 * Crea la campaña, dispara el envío y espera el resultado. Si la respuesta del envío se
 * pierde (timeout del navegador), sigue consultando el estado: la función ya está corriendo.
 */
export function useSendPromo(onProgress?: (broadcast: PromoBroadcast) => void) {
  const { profile, userId } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: PromoSendInput): Promise<PromoSendOutcome> => {
      const client = requireClient()
      const tenantId = profile?.tenant_id
      if (!tenantId) throw new Error('No se pudo resolver el negocio')

      const created = await createPromoBroadcast(client, {
        tenantId,
        createdBy: userId,
        title: input.title,
        bodyText: input.bodyText,
        imageUrl: input.imageUrl,
        recipients: input.recipients,
      })
      onProgress?.(created)

      let responseLost = false
      try {
        await sendPromoBroadcast(client, created.id)
      } catch (err) {
        responseLost = true
        console.warn('[promos] respuesta del envío no recibida; consultando estado:', err)
      }

      const broadcast = await waitForPromoBroadcast(client, created.id, {
        onTick: onProgress,
        waitForDraft: responseLost,
      })
      const failedItems = await listFailedPromoItems(client, broadcast.id)
      return { broadcast, failedItems }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.promos.all }),
  })
}

export function useDeletePromo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (broadcast: Pick<PromoBroadcast, 'id' | 'image_url'>) =>
      deletePromoBroadcast(requireClient(), broadcast),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.promos.all }),
  })
}
