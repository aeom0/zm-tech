'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  fetchWebSettings,
  updateWebSettings,
  uploadWebAsset,
  type WebAssetFolder,
  type WebSettingsPatch,
} from './webSettingsService'
import { supabase } from '@/lib/supabase'

export const WEB_SETTINGS_KEY = ['web_settings'] as const

export function useWebSettings() {
  return useQuery({
    queryKey: WEB_SETTINGS_KEY,
    queryFn: fetchWebSettings,
    staleTime: 30_000,
  })
}

export function useUpdateWebSettings() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (args: { rowId: string; patch: WebSettingsPatch }) => {
      await updateWebSettings(args.rowId, args.patch)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: WEB_SETTINGS_KEY })
    },
  })
}

export function useUploadWebAsset() {
  return useMutation({
    mutationFn: async (args: { tenantSlug: string; folder: WebAssetFolder; file: File }) => {
      if (!supabase) throw new Error('Supabase no está configurado')
      return uploadWebAsset(args.tenantSlug, args.folder, args.file)
    },
  })
}
