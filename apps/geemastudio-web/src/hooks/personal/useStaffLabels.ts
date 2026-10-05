'use client'

import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export function useStaffLabels() {
  return useQuery({
    queryKey: ['web_staff_terminology'],
    enabled: !!supabase,
    staleTime: 60_000,
    queryFn: async () => {
      if (!supabase) return { plural: 'Profesionales', singular: 'Profesional' }
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return { plural: 'Profesionales', singular: 'Profesional' }
      const { data } = await supabase
        .from('tenant_settings')
        .select('staff_terminology, staff_singular_terminology')
        .eq('id', user.id)
        .maybeSingle()
      return {
        plural: (data?.staff_terminology as string | undefined) || 'Profesionales',
        singular: (data?.staff_singular_terminology as string | undefined) || 'Profesional',
      }
    },
  })
}
