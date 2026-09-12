import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  fetchWebSettings,
  updateWebSettings,
} from '@/services/webSettingsService'
import type { WebSettingsPatch } from '@/types/web-landing'

export const WEB_SETTINGS_KEY = ['web_settings'] as const

export function useWebSettings() {
  return useQuery({
    queryKey: WEB_SETTINGS_KEY,
    queryFn: fetchWebSettings,
  })
}

export function useUpdateWebSettings() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      rowId,
      patch,
    }: {
      rowId: string
      patch: WebSettingsPatch
    }) => {
      await updateWebSettings(rowId, patch)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: WEB_SETTINGS_KEY })
    },
  })
}
