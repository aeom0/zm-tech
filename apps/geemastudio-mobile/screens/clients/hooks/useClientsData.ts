import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import type { Client, ClientWithMetrics, ClientSegment, ClientKPIs } from '../types'

interface UseClientsDataResult {
  clients: ClientWithMetrics[]
  filteredClients: ClientWithMetrics[]
  kpis: ClientKPIs | null
  isLoading: boolean
  isError: boolean
}

interface RawAppointment {
  id: string
  client_id: string | null
  client_name: string
  date: string
  status: string
  price: string
  service_id: string | null
}

interface RawPayment {
  id: string
  appointment_id: string | null
  amount: string
  date: string
}

export function useClientsData(searchQuery: string, segment: ClientSegment): UseClientsDataResult {
  const {
    data: clients = [],
    isLoading: clientsLoading,
    isError: clientsError,
  } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, phone, email, notes, created_at')
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(error.message)
      }

      return (data ?? []) as Client[]
    },
  })

  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0).toISOString()

  const {
    data: appointments = [],
    isLoading: aptsLoading,
    isError: aptsError,
  } = useQuery<RawAppointment[]>({
    queryKey: ['clients_appointments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, client_id, client_name, date, status, price, service_id')
        .order('date', { ascending: true })

      if (error) {
        throw new Error(error.message)
      }

      return (data ?? []) as RawAppointment[]
    },
  })

  const {
    data: payments = [],
    isLoading: paymentsLoading,
    isError: paymentsError,
  } = useQuery<RawPayment[]>({
    queryKey: ['clients_payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('id, appointment_id, amount, date')
        .order('date', { ascending: true })

      if (error) {
        throw new Error(error.message)
      }

      return (data ?? []) as RawPayment[]
    },
  })

  const {
    clientsWithMetrics,
    kpis,
  }: { clientsWithMetrics: ClientWithMetrics[]; kpis: ClientKPIs | null } = useMemo(() => {
    if (clients.length === 0) {
      return {
        clientsWithMetrics: [],
        kpis: {
          total_clients: 0,
          active_this_month: 0,
          vip_count: 0,
          at_risk_count: 0,
          avg_ticket: 0,
        },
      }
    }

    const appointmentsByClient: Record<string, RawAppointment[]> = {}
    const paymentsByAppointment: Record<string, RawPayment[]> = {}

    for (const apt of appointments) {
      const clientId = apt.client_id ?? ''
      if (!clientId) continue
      if (!appointmentsByClient[clientId]) {
        appointmentsByClient[clientId] = []
      }
      appointmentsByClient[clientId].push(apt)
    }

    for (const p of payments) {
      const aptId = p.appointment_id ?? ''
      if (!aptId) continue
      if (!paymentsByAppointment[aptId]) {
        paymentsByAppointment[aptId] = []
      }
      paymentsByAppointment[aptId].push(p)
    }

    const now = new Date()
    const FORTY_FIVE_DAYS = 45
    const vipVisitsThreshold = 5

    const clientsWithMetricsLocal: ClientWithMetrics[] = clients.map((client) => {
      const clientAppointments = appointmentsByClient[client.id] ?? []

      const completedApts = clientAppointments.filter((a) => a.status === 'completed')

      let totalVisits = completedApts.length
      let totalSpent = 0
      let lastVisitDate: string | null = null

      for (const apt of completedApts) {
        const aDate = new Date(apt.date)
        if (!lastVisitDate || aDate > new Date(lastVisitDate)) {
          lastVisitDate = apt.date
        }

        const relatedPayments = paymentsByAppointment[apt.id] ?? []
        if (relatedPayments.length > 0) {
          for (const p of relatedPayments) {
            const amt = parseFloat(p.amount)
            if (!Number.isNaN(amt)) {
              totalSpent += amt
            }
          }
        } else {
          const price = parseFloat(apt.price)
          if (!Number.isNaN(price)) {
            totalSpent += price
          }
        }
      }

      let daysSinceLastVisit: number | null = null
      if (lastVisitDate) {
        const diffMs = now.getTime() - new Date(lastVisitDate).getTime()
        daysSinceLastVisit = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      }

      let favoriteService: string | null = null
      if (completedApts.length > 0) {
        const serviceFrequency: Record<string, number> = {}
        for (const apt of completedApts) {
          if (!apt.service_id) continue
          serviceFrequency[apt.service_id] = (serviceFrequency[apt.service_id] ?? 0) + 1
        }
        const [favServiceId] = Object.entries(serviceFrequency).sort((a, b) => b[1] - a[1])[0] ?? []
        favoriteService = favServiceId ?? null
      }

      const is_vip = totalVisits >= vipVisitsThreshold || totalSpent >= 5 * 50
      const is_at_risk = daysSinceLastVisit != null && daysSinceLastVisit > FORTY_FIVE_DAYS
      const is_new =
        lastVisitDate != null &&
        now.getTime() - new Date(lastVisitDate).getTime() < 30 * 24 * 60 * 60 * 1000

      return {
        ...client,
        total_visits: totalVisits,
        total_spent: totalSpent,
        last_visit_date: lastVisitDate,
        favorite_service: favoriteService,
        days_since_last_visit: daysSinceLastVisit,
        is_vip,
        is_new,
        is_at_risk,
      }
    })

    const totalClients = clientsWithMetricsLocal.length
    const activeThisMonth = clientsWithMetricsLocal.filter((c) => {
      if (!c.last_visit_date) return false
      return c.last_visit_date >= monthStart
    }).length

    const vipClients = clientsWithMetricsLocal.filter(
      (c) => c.total_visits >= vipVisitsThreshold
    ).length

    const atRiskClients = clientsWithMetricsLocal.filter((c) => {
      if (c.days_since_last_visit == null) return false
      return c.days_since_last_visit > FORTY_FIVE_DAYS
    }).length

    const totalRevenue = clientsWithMetricsLocal.reduce((sum, c) => sum + c.total_spent, 0)
    const avgTicket = totalClients > 0 ? totalRevenue / totalClients : 0

    const kpisLocal: ClientKPIs = {
      total_clients: totalClients,
      active_this_month: activeThisMonth,
      vip_count: vipClients,
      at_risk_count: atRiskClients,
      avg_ticket: avgTicket,
    }

    return {
      clientsWithMetrics: clientsWithMetricsLocal,
      kpis: kpisLocal,
    }
  }, [clients, appointments, payments, monthStart])

  const filteredClients = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase()

    let base = clientsWithMetrics

    if (normalizedSearch.length > 0) {
      base = base.filter((c) => {
        return (
          c.name.toLowerCase().includes(normalizedSearch) ||
          c.phone.toLowerCase().includes(normalizedSearch) ||
          (c.email ?? '').toLowerCase().includes(normalizedSearch)
        )
      })
    }

    const now = new Date()
    const THIRTY_DAYS = 30
    const FORTY_FIVE_DAYS = 45
    const vipVisitsThreshold = 5

    return base.filter((c) => {
      if (segment === 'all') return true

      const days = c.days_since_last_visit != null ? c.days_since_last_visit : Infinity

      switch (segment) {
        case 'vip':
          return c.total_visits >= vipVisitsThreshold || c.total_spent >= 5 * 50
        case 'regular':
          return c.total_visits >= 2 && c.total_visits < vipVisitsThreshold
        case 'at_risk':
          return days > FORTY_FIVE_DAYS
        case 'new':
          if (!c.last_visit_date) return false
          return (
            (now.getTime() - new Date(c.last_visit_date).getTime()) / (1000 * 60 * 60 * 24) <
            THIRTY_DAYS
          )
        default:
          return true
      }
    })
  }, [clientsWithMetrics, searchQuery, segment])

  return {
    clients: clientsWithMetrics,
    filteredClients,
    kpis,
    isLoading: clientsLoading || aptsLoading || paymentsLoading,
    isError: clientsError || aptsError || paymentsError,
  }
}
