import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import { useProfileTenantId } from '@/screens/finances/hooks/useProfileTenantId'
import type { Client, ClientWithMetrics, ClientSegment, ClientKPIs, ClientSortKey } from '../types'

interface UseClientsDataResult {
  clients: ClientWithMetrics[]
  filteredClients: ClientWithMetrics[]
  kpis: ClientKPIs | null
  isLoading: boolean
  isFetching: boolean
  isError: boolean
  refetch: () => Promise<unknown>
}

interface RawAppointment {
  id: string
  client_id: string | null
  date: string
  price: string
  service_id: string | null
}

interface RawPayment {
  appointment_id: string | null
  amount: string
}

const VIP_VISITS = 5
const VIP_SPEND = 5 * 50
const AT_RISK_DAYS = 45
const NEW_DAYS = 30
/** Tope de filas en listado (paridad ZM). FlatList virtualiza; el tope acota red + métricas. */
const CLIENTS_FETCH_LIMIT = 300

function emptyKpis(): ClientKPIs {
  return {
    total_clients: 0,
    active_this_month: 0,
    vip_count: 0,
    at_risk_count: 0,
    avg_ticket: 0,
  }
}

export function useClientsData(
  searchQuery: string,
  segment: ClientSegment,
  sortBy: ClientSortKey = 'last_visit'
): UseClientsDataResult {
  const { tenantId, isLoading: tenantLoading } = useProfileTenantId()
  const queryEnabled = !tenantLoading && !!tenantId

  const monthStartIso = useMemo(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0).toISOString()
  }, [])

  const {
    data: clients = [],
    isLoading: clientsLoading,
    isFetching: clientsFetching,
    isError: clientsError,
    refetch: refetchClients,
  } = useQuery<Client[]>({
    queryKey: ['clients', tenantId],
    enabled: queryEnabled,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, phone, email, notes, created_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(CLIENTS_FETCH_LIMIT)

      if (error) {
        throw new Error(error.message)
      }

      return (data ?? []) as Client[]
    },
  })

  const clientIds = useMemo(() => clients.map((c) => c.id), [clients])

  const {
    data: appointments = [],
    isFetching: aptsFetching,
    isError: aptsError,
    refetch: refetchAppointments,
  } = useQuery<RawAppointment[]>({
    queryKey: ['clients_appointments', tenantId, clientIds],
    enabled: queryEnabled && clientIds.length > 0,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, client_id, date, price, service_id')
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .in('client_id', clientIds)
        .order('date', { ascending: false })

      if (error) {
        throw new Error(error.message)
      }

      return (data ?? []) as RawAppointment[]
    },
  })

  const aptIds = useMemo(() => appointments.map((a) => a.id), [appointments])

  const {
    data: payments = [],
    isFetching: paymentsFetching,
    isError: paymentsError,
    refetch: refetchPayments,
  } = useQuery<RawPayment[]>({
    queryKey: ['clients_payments', tenantId, aptIds],
    enabled: queryEnabled && aptIds.length > 0,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('appointment_id, amount')
        .eq('tenant_id', tenantId)
        .in('appointment_id', aptIds)

      if (error) {
        throw new Error(error.message)
      }

      return (data ?? []) as RawPayment[]
    },
  })

  const { clientsWithMetrics, kpis }: { clientsWithMetrics: ClientWithMetrics[]; kpis: ClientKPIs } =
    useMemo(() => {
      if (clients.length === 0) {
        return { clientsWithMetrics: [], kpis: emptyKpis() }
      }

      const appointmentsByClient: Record<string, RawAppointment[]> = {}
      const paymentsByAppointment: Record<string, number> = {}

      for (const apt of appointments) {
        const clientId = apt.client_id
        if (!clientId) continue
        if (!appointmentsByClient[clientId]) {
          appointmentsByClient[clientId] = []
        }
        appointmentsByClient[clientId].push(apt)
      }

      for (const p of payments) {
        const aptId = p.appointment_id
        if (!aptId) continue
        const amt = parseFloat(p.amount)
        if (Number.isNaN(amt)) continue
        paymentsByAppointment[aptId] = (paymentsByAppointment[aptId] ?? 0) + amt
      }

      const now = Date.now()

      const clientsWithMetricsLocal: ClientWithMetrics[] = clients.map((client) => {
        const completedApts = appointmentsByClient[client.id] ?? []

        let totalSpent = 0
        let lastVisitDate: string | null = null
        const serviceFrequency: Record<string, number> = {}

        for (const apt of completedApts) {
          if (!lastVisitDate || apt.date > lastVisitDate) {
            lastVisitDate = apt.date
          }

          const paid = paymentsByAppointment[apt.id]
          if (paid != null) {
            totalSpent += paid
          } else {
            const price = parseFloat(apt.price)
            if (!Number.isNaN(price)) {
              totalSpent += price
            }
          }

          if (apt.service_id) {
            serviceFrequency[apt.service_id] = (serviceFrequency[apt.service_id] ?? 0) + 1
          }
        }

        const totalVisits = completedApts.length
        const daysSinceLastVisit =
          lastVisitDate != null
            ? Math.floor((now - new Date(lastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
            : null

        const [favServiceId] =
          Object.entries(serviceFrequency).sort((a, b) => b[1] - a[1])[0] ?? []

        return {
          ...client,
          total_visits: totalVisits,
          total_spent: totalSpent,
          last_visit_date: lastVisitDate,
          favorite_service: favServiceId ?? null,
          days_since_last_visit: daysSinceLastVisit,
          is_vip: totalVisits >= VIP_VISITS || totalSpent >= VIP_SPEND,
          is_new:
            lastVisitDate != null &&
            now - new Date(lastVisitDate).getTime() < NEW_DAYS * 24 * 60 * 60 * 1000,
          is_at_risk: daysSinceLastVisit != null && daysSinceLastVisit > AT_RISK_DAYS,
        }
      })

      const totalClients = clientsWithMetricsLocal.length
      const activeThisMonth = clientsWithMetricsLocal.filter(
        (c) => c.last_visit_date != null && c.last_visit_date >= monthStartIso
      ).length
      const vipClients = clientsWithMetricsLocal.filter((c) => c.total_visits >= VIP_VISITS).length
      const atRiskClients = clientsWithMetricsLocal.filter(
        (c) => c.days_since_last_visit != null && c.days_since_last_visit > AT_RISK_DAYS
      ).length
      const totalRevenue = clientsWithMetricsLocal.reduce((sum, c) => sum + c.total_spent, 0)

      return {
        clientsWithMetrics: clientsWithMetricsLocal,
        kpis: {
          total_clients: totalClients,
          active_this_month: activeThisMonth,
          vip_count: vipClients,
          at_risk_count: atRiskClients,
          avg_ticket: totalClients > 0 ? totalRevenue / totalClients : 0,
        },
      }
    }, [clients, appointments, payments, monthStartIso])

  const filteredClients = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase()
    let base = clientsWithMetrics

    if (normalizedSearch.length > 0) {
      base = base.filter((c) => {
        return (
          c.name.toLowerCase().includes(normalizedSearch) ||
          (c.phone ?? '').toLowerCase().includes(normalizedSearch) ||
          (c.email ?? '').toLowerCase().includes(normalizedSearch)
        )
      })
    }

    const now = Date.now()

    const filtered = base.filter((c) => {
      if (segment === 'all') return true

      const days = c.days_since_last_visit ?? Infinity

      switch (segment) {
        case 'vip':
          return c.total_visits >= VIP_VISITS || c.total_spent >= VIP_SPEND
        case 'regular':
          return c.total_visits >= 2 && c.total_visits < VIP_VISITS
        case 'at_risk':
          return days > AT_RISK_DAYS
        case 'new':
          if (!c.last_visit_date) return false
          return (now - new Date(c.last_visit_date).getTime()) / (1000 * 60 * 60 * 24) < NEW_DAYS
        default:
          return true
      }
    })

    const sorted = [...filtered]
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'spent':
          return b.total_spent - a.total_spent
        case 'name':
          return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
        case 'last_visit':
        default: {
          const aT = a.last_visit_date ? new Date(a.last_visit_date).getTime() : 0
          const bT = b.last_visit_date ? new Date(b.last_visit_date).getTime() : 0
          return bT - aT
        }
      }
    })
    return sorted
  }, [clientsWithMetrics, searchQuery, segment, sortBy])

  return {
    clients: clientsWithMetrics,
    filteredClients,
    kpis,
    isLoading: clientsLoading || tenantLoading,
    isFetching: clientsFetching || aptsFetching || paymentsFetching,
    isError: clientsError || aptsError || paymentsError,
    refetch: async () => {
      await Promise.all([refetchClients(), refetchAppointments(), refetchPayments()])
    },
  }
}
