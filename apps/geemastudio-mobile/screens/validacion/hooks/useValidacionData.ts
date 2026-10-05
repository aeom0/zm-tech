import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { useEmployeesQuery } from '@/screens/personal/hooks/useEmployeesData'
import { detectCatalogDialect } from '@/screens/services/lib/catalogAdapter'
import type { ValidacionItem, ValidacionFilter, VerificationAction } from '../types'

/** Ventana del historial: evita listas enormes y mantiene la pantalla ágil. */
const HISTORY_DAYS = 30
const HISTORY_LIMIT = 100

const historySince = () => new Date(Date.now() - HISTORY_DAYS * 86_400_000).toISOString()

interface AppointmentRow {
  id: string
  client_name: string
  date: string
  price: number
  service_id: string | null
  employee_id: string | null
}

interface ZmVerificationRow {
  id: string
  client_name: string
  service_name: string
  appointment_date: string
  amount_deposit: number | string | null
  amount_total: number | string | null
  kind: string | null
  approved_at: string | null
  rejected_at: string | null
  deposit_forfeit_risk: boolean | null
}

export function useValidacionData() {
  const { userId } = useAuth()
  const { config } = useTenant()
  const queryClient = useQueryClient()

  const { data: employees = [] } = useEmployeesQuery({ staleTime: 5 * 60_000 })

  const { data: services = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['validacion_services'],
    queryFn: async () => {
      const { data, error } = await supabase.from('services').select('id, name')
      if (error) throw new Error(error.message)
      return data ?? []
    },
    staleTime: 5 * 60_000,
  })

  const { data: dialect } = useQuery({
    queryKey: ['validacion_dialect'],
    queryFn: detectCatalogDialect,
    staleTime: Infinity,
  })

  const employeeById = Object.fromEntries(employees.map((e) => [e.id, e]))
  const serviceById = Object.fromEntries(services.map((s) => [s.id, s]))

  const enrich = (
    apt: AppointmentRow,
    status: ValidacionFilter,
    resolvedAt: string | null,
    readOnly: boolean
  ): ValidacionItem => ({
    id: apt.id,
    client_name: apt.client_name,
    date: apt.date,
    price: Number(apt.price),
    serviceName: apt.service_id ? (serviceById[apt.service_id]?.name ?? '—') : '—',
    employeeName: apt.employee_id
      ? (employeeById[apt.employee_id]?.name ?? '—')
      : 'Sin asignar',
    employeeColor: apt.employee_id ? (employeeById[apt.employee_id]?.color ?? undefined) : undefined,
    status,
    resolvedAt,
    readOnly,
  })

  const listQuery = (filter: ValidacionFilter) => ({
    queryKey: ['validacion_pagos', filter, dialect],
    enabled: dialect !== undefined,
    refetchInterval: 30_000,
    queryFn: async (): Promise<ValidacionItem[]> => {
      // Tenants con verificaciones propias (ZM): el pago vive en appointment_verifications.
      if (dialect === 'zm') {
        const statusByFilter = {
          pending: 'payment_submitted',
          approved: 'approved',
          rejected: 'rejected',
        } as const
        let q = supabase
          .from('appointment_verifications')
          .select(
            'id, client_name, service_name, appointment_date, amount_deposit, amount_total, kind, approved_at, rejected_at, deposit_forfeit_risk'
          )
          .eq('status', statusByFilter[filter])
          .order('created_at', { ascending: false })
          .limit(HISTORY_LIMIT)
        if (filter !== 'pending') q = q.gte('created_at', historySince())
        const { data, error } = await q
        if (error) throw new Error(error.message)
        return ((data ?? []) as ZmVerificationRow[]).map((v) => ({
          id: v.id,
          client_name: v.client_name,
          date: v.appointment_date,
          price: Number(v.kind === 'post_service_payment' ? v.amount_total : v.amount_deposit) || 0,
          serviceName: v.service_name || '—',
          status: filter,
          resolvedAt: v.approved_at ?? v.rejected_at,
          // La aprobación de estos pagos también avisa a la clienta por WhatsApp y se hace desde el otro flujo.
          readOnly: true,
          depositForfeited: v.deposit_forfeit_risk === true,
          canMarkForfeit: v.kind !== 'post_service_payment' && filter !== 'rejected',
        }))
      }

      if (filter === 'pending') {
        const { data, error } = await supabase
          .from('appointments')
          .select('id, client_name, date, price, service_id, employee_id')
          .eq('status', 'payment_submitted')
          .order('date', { ascending: true })
        if (error) throw new Error(error.message)
        return ((data ?? []) as AppointmentRow[]).map((a) => enrich(a, 'pending', null, false))
      }

      const { data: verifs, error: vErr } = await supabase
        .from('appointment_verifications')
        .select('appointment_id, verified_at')
        .eq('action', filter)
        .gte('verified_at', historySince())
        .order('verified_at', { ascending: false })
        .limit(HISTORY_LIMIT)
      if (vErr) throw new Error(vErr.message)
      const rows = verifs ?? []
      if (rows.length === 0) return []
      const { data: apts, error: aErr } = await supabase
        .from('appointments')
        .select('id, client_name, date, price, service_id, employee_id')
        .in(
          'id',
          rows.map((r) => r.appointment_id)
        )
      if (aErr) throw new Error(aErr.message)
      const aptById = new Map(((apts ?? []) as AppointmentRow[]).map((a) => [a.id, a]))
      return rows.flatMap((r) => {
        const apt = aptById.get(r.appointment_id)
        return apt ? [enrich(apt, filter, r.verified_at, true)] : []
      })
    },
  })

  const pendingQ = useQuery(listQuery('pending'))
  const approvedQ = useQuery(listQuery('approved'))
  const rejectedQ = useQuery(listQuery('rejected'))

  const byFilter = {
    pending: pendingQ,
    approved: approvedQ,
    rejected: rejectedQ,
  }

  // Mutación: aprobar o rechazar una cita — per-row
  const verifyMutation = useMutation({
    mutationFn: async ({
      appointmentId,
      action,
    }: {
      appointmentId: string
      action: VerificationAction
    }) => {
      const { error: verifyError } = await supabase.from('appointment_verifications').insert({
        appointment_id: appointmentId,
        verified_by: userId!,
        action,
      })
      if (verifyError) throw new Error(verifyError.message)

      const newStatus = action === 'approved' ? 'completed' : 'cancelled'
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId)
      if (updateError) throw new Error(updateError.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['validacion_pagos'] })
      queryClient.invalidateQueries({ queryKey: ['badges', 'payment_submitted'] })
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
    },
  })

  // Marca interna «Adelanto perdido»: no avisa a la clienta.
  const forfeitMutation = useMutation({
    mutationFn: async ({ verificationId, forfeited }: { verificationId: string; forfeited: boolean }) => {
      const { error } = await supabase
        .from('appointment_verifications')
        .update({ deposit_forfeit_risk: forfeited, updated_at: new Date().toISOString() })
        .eq('id', verificationId)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['validacion_pagos'] })
    },
  })

  return {
    byFilter,
    counts: {
      pending: pendingQ.data?.length ?? 0,
      approved: approvedQ.data?.length ?? 0,
      rejected: rejectedQ.data?.length ?? 0,
    },
    historyDays: HISTORY_DAYS,
    refetchAll: () => Promise.all([pendingQ.refetch(), approvedQ.refetch(), rejectedQ.refetch()]),
    verifyMutation,
    forfeitMutation,
    config,
  }
}
