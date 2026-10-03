'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import { resolveTenantSlugForWrites } from './useWabaStatus'

export type EmployeeOption = {
  id: string
  name: string
  isActive: boolean
}

export type CategoryOption = {
  id: string
  name: string
}

export type WabaRulesSnapshot = {
  settingsId: string
  tenantSlug: string
  rules: Record<string, unknown> | null
  employees: EmployeeOption[]
  categories: CategoryOption[]
}

export function useWabaRules() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['tenant_settings', 'waba_rules'],
    enabled: !!supabase,
    queryFn: async (): Promise<WabaRulesSnapshot> => {
      if (!supabase) throw new Error('No se pudo conectar. Intenta de nuevo.')
      const tenantId = await resolveTenantSlugForWrites()
      const [settingsRes, employeesRes, categoriesRes] = await Promise.all([
        supabase
          .from('tenant_settings')
          .select('id, tenant_slug, waba_rules')
          .eq('tenant_slug', tenantId)
          .maybeSingle(),
        supabase
          .from('employees')
          .select('id, name, is_active')
          .eq('tenant_id', tenantId)
          .order('name'),
        supabase
          .from('service_categories')
          .select('id, name, order')
          .eq('tenant_id', tenantId)
          .order('order'),
      ])
      if (settingsRes.error) throw settingsRes.error
      if (employeesRes.error) throw employeesRes.error
      if (categoriesRes.error) throw categoriesRes.error
      const settings = settingsRes.data as {
        id?: string
        tenant_slug?: string
        waba_rules?: Record<string, unknown> | null
      } | null
      if (!settings?.id) throw new Error('No hay configuración de este salón.')
      const employees = (employeesRes.data ?? []) as Array<{
        id: string
        name: string
        is_active: boolean | null
      }>
      const categories = (categoriesRes.data ?? []) as Array<{ id: string; name: string }>
      return {
        settingsId: settings.id,
        tenantSlug: settings.tenant_slug ?? tenantId,
        rules: settings.waba_rules ?? null,
        employees: employees.map((row) => ({
          id: row.id,
          name: row.name,
          isActive: row.is_active !== false,
        })),
        categories: categories.map((row) => ({ id: row.id, name: row.name })),
      }
    },
  })

  const mutation = useMutation({
    mutationFn: async ({
      settingsId,
      tenantSlug,
      rules,
    }: {
      settingsId: string
      tenantSlug: string
      rules: Record<string, unknown>
    }) => {
      if (!supabase) throw new Error('No se pudo conectar. Intenta de nuevo.')
      const { error } = await supabase
        .from('tenant_settings')
        .update({ waba_rules: rules, updated_at: new Date().toISOString() })
        .eq('id', settingsId)
        .eq('tenant_slug', tenantSlug)
      if (error) throw error
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['tenant_settings', 'waba_rules'] })
    },
  })

  return { query, mutation }
}
