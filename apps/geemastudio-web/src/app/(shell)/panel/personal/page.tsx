'use client'

import { useMemo, useState } from 'react'

import { EmployeeCard, PersonalHeaderActions } from './_components/EmployeeCard'
import { EmployeeModal } from './_components/EmployeeModal'
import { useDashboardTenant } from '@/hooks/dashboard/useDashboardTenant'
import {
  useDeleteEmployee,
  useEmployees,
  useEmployeesDialect,
  useUpsertEmployee,
} from '@/hooks/personal/useEmployees'
import type { EmployeeRow } from '@/hooks/personal/types'
import { FeatureAvailabilityNotice } from '@/components/plan/FeatureAvailabilityNotice'
import { PlanLimitNotice } from '@/components/plan/PlanLimitNotice'
import { usePlan } from '@/hooks/plan/usePlan'
import { resolveDashboardCurrencyCode } from '@/lib/dashboardCurrency'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { FilterChips } from '@/components/ui/FilterChips'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { StateNote } from '@/components/ui/StateNote'
import { PageHeader } from '@/components/ui/PageHeader'

function useStaffLabels() {
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

export default function PanelPersonalPage() {
  const employeesQuery = useEmployees()
  const dialectQuery = useEmployeesDialect()
  const upsert = useUpsertEmployee()
  const remove = useDeleteEmployee()
  const { confirm, dialog } = useConfirm()
  const tenantQuery = useDashboardTenant()
  const labelsQuery = useStaffLabels()
  const { subscription: plan, staffStatus, can } = usePlan()

  const currencyCode = resolveDashboardCurrencyCode(tenantQuery.data?.currency_code)
  const showGeemaExtras = dialectQuery.data === 'geema'
  const staffPlural = labelsQuery.data?.plural ?? 'Profesionales'
  const staffSingular = labelsQuery.data?.singular ?? 'Profesional'

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<EmployeeRow | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const filtered = useMemo(() => {
    const employees = employeesQuery.data ?? []
    if (filter === 'active') return employees.filter((e) => e.is_active)
    if (filter === 'inactive') return employees.filter((e) => !e.is_active)
    return employees
  }, [employeesQuery.data, filter])

  const openCreate = () => {
    setEditing(null)
    setIsCreating(true)
    setModalOpen(true)
  }

  const openEdit = (emp: EmployeeRow) => {
    setEditing(emp)
    setIsCreating(false)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)
    setIsCreating(false)
  }

  const errorMessage =
    (employeesQuery.error as Error | null)?.message ??
    (dialectQuery.error as Error | null)?.message ??
    null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader title={staffPlural} description="Equipo, colores de agenda, comisiones y foto de perfil." />
        <PersonalHeaderActions onNew={openCreate} staffSingular={staffSingular} />
      </div>

      {plan && (
        <PlanLimitNotice
          status={staffStatus}
          resource={staffPlural.toLowerCase()}
          usage={plan.staff_count}
          limit={plan.max_staff}
          planName={plan.plan_name}
        />
      )}

      <FeatureAvailabilityNotice
        feature="commissions"
        label="las comisiones automáticas"
        included={can('commissions')}
      />

      <FilterChips
        ariaLabel="Estado del personal"
        value={filter}
        onChange={setFilter}
        options={[
          { id: 'all', label: 'Todos' },
          { id: 'active', label: 'Activos' },
          { id: 'inactive', label: 'Inactivos' },
        ]}
        trailing={
          <span className="self-center text-xs text-fg-subtle">
          {filtered.length}{' '}
          {filtered.length === 1 ? staffSingular.toLowerCase() : staffPlural.toLowerCase()}
        </span>
        }
      />

      {errorMessage && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          {errorMessage}
        </div>
      )}

      {employeesQuery.isLoading && (
        <StateNote kind="loading">Cargando {staffPlural.toLowerCase()}…</StateNote>
      )}

      {!employeesQuery.isLoading && !errorMessage && filtered.length === 0 && (
        <StateNote kind="empty">No hay {staffPlural.toLowerCase()} en este filtro.</StateNote>
      )}

      {!employeesQuery.isLoading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((emp) => (
            <EmployeeCard
              key={emp.id}
              employee={emp}
              currencyCode={currencyCode}
              showGeemaExtras={showGeemaExtras}
              onClick={() => openEdit(emp)}
            />
          ))}
        </div>
      )}

      <EmployeeModal
        open={modalOpen}
        initial={editing}
        isCreating={isCreating}
        showGeemaExtras={showGeemaExtras}
        currencyCode={currencyCode}
        staffSingular={staffSingular}
        isSaving={upsert.isPending}
        isDeleting={remove.isPending}
        onClose={closeModal}
        onSave={({ data, avatarFile, removeAvatar }) => {
          upsert.mutate(
            {
              id: editing?.id,
              data,
              avatarFile,
              removeAvatar,
            },
            { onSuccess: () => closeModal() }
          )
        }}
        onDelete={
          editing
            ? async () => {
                const ok = await confirm({
                  title: `¿Eliminar a ${editing.name}?`,
                  description: 'Esta acción no se puede deshacer.',
                  confirmLabel: 'Eliminar',
                  destructive: true,
                })
                if (!ok) return
                remove.mutate(
                  { id: editing.id, avatar_url: editing.avatar_url },
                  { onSuccess: () => closeModal() }
                )
              }
            : undefined
        }
      />
      {dialog}
    </div>
  )
}
