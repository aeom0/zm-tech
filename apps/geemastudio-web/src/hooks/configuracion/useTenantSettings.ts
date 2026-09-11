'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  fetchTenantSettingsForSession,
  updateTenantSettings,
  uploadTenantLogo,
} from './tenantSettingsService'
import type { TenantSettingsPatch } from './types'
import { supabase } from '@/lib/supabase'

export const WEB_TENANT_SETTINGS_KEY = ['web_tenant_settings'] as const

export function useTenantSettings() {
  return useQuery({
    queryKey: WEB_TENANT_SETTINGS_KEY,
    queryFn: fetchTenantSettingsForSession,
    staleTime: 30_000,
  })
}

export function useUpdateTenantSettings() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (args: { rowId: string; patch: TenantSettingsPatch }) => {
      await updateTenantSettings(args.rowId, args.patch)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: WEB_TENANT_SETTINGS_KEY })
      void qc.invalidateQueries({ queryKey: ['dashboard_tenant_settings'] })
      void qc.invalidateQueries({ queryKey: ['web_staff_terminology'] })
    },
  })
}

export function useUploadTenantLogo() {
  return useMutation({
    mutationFn: async (file: File) => {
      if (!supabase) throw new Error('Supabase no está configurado')
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('No hay sesión activa')
      return uploadTenantLogo(user.id, file)
    },
  })
}
