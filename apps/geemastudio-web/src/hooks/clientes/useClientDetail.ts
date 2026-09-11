'use client'

import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import type { AppointmentHistory } from './types'

type AptRow = {
  id: string
  date: string
  status: string
  price: string | null
  notes: string | null
  service_id: string | null
  service_ids: string[] | string | null
  service_names_snapshot: string[] | null
  employee_id: string | null
}

export function useClientDetail(clientId: string | null) {
  return useQuery({
    queryKey: ['web_client_detail', clientId],
    enabled: !!clientId && !!supabase,
    staleTime: 60_000,
    queryFn: async (): Promise<AppointmentHistory[]> => {
      if (!clientId) return []
      if (!supabase) throw new Error('Supabase no está configurado')

      const { data: apts, error } = await supabase
        .from('appointments')
        .select(
          'id, date, status, price, notes, service_id, service_ids, service_names_snapshot, employee_id'
        )
        .eq('client_id', clientId)
        .order('date', { ascending: false })
        .limit(30)

      if (error) throw new Error(error.message)
      if (!apts || apts.length === 0) return []

      const aptRows = apts as AptRow[]
      const aptIds = aptRows.map((a) => a.id)
      const allEmpIds = new Set<string>()
      for (const a of aptRows) {
        if (a.employee_id) allEmpIds.add(a.employee_id)
      }

      const [
        { data: aptSvcLines },
        { data: payments },
        { data: allServices },
        { data: employees },
      ] = await Promise.all([
        supabase
          .from('appointment_services')
          .select('appointment_id, service_id, employee_id')
          .in('appointment_id', aptIds),
        supabase
          .from('payments')
          .select('appointment_id, amount, is_abono')
          .in('appointment_id', aptIds),
        supabase.from('services').select('id, name'),
        allEmpIds.size > 0
          ? supabase
              .from('employees')
              .select('id, name, color')
              .in('id', [...allEmpIds])
          : Promise.resolve({ data: [] as { id: string; name: string; color: string | null }[] }),
      ])

      const svcMap = new Map(
        (allServices ?? []).map((s: { id: string; name: string }) => [String(s.id).trim(), s])
      )
      const empMap = new Map(
        (employees ?? []).map((e: { id: string; name: string; color: string | null }) => [e.id, e])
      )

      const buildSvcList = (
        svcIds: (string | number | null | undefined)[]
      ): { name: string; category_color: string | null }[] =>
        svcIds.map((svcId) => {
          const key = svcId != null ? String(svcId).trim() : ''
          const svc = key ? svcMap.get(key) : undefined

          let fallbackName = 'Servicio sin nombre'
          if (!svc && key) {
            if (key.startsWith('svc-')) {
              const slug = key.replace(/^svc-/, '')
              fallbackName = slug
                .split('-')
                .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
                .join(' ')
            } else if (!/^[0-9a-f-]{36}$/i.test(key)) {
              fallbackName = key
            }
          }

          return { name: svc?.name ?? fallbackName, category_color: null }
        })

      return aptRows.map((a) => {
        const totalPaid = (payments ?? [])
          .filter((p: { appointment_id: string; amount: string }) => p.appointment_id === a.id)
          .reduce(
            (sum: number, p: { amount: string }) => sum + parseFloat(p.amount ?? '0'),
            0
          )
        const price = parseFloat(a.price ?? '0')
        const namesSnapshot = a.service_names_snapshot ?? null
        const aptLines = (aptSvcLines ?? []).filter(
          (l: { appointment_id: string }) => l.appointment_id === a.id
        )

        let svcList: { name: string; category_color: string | null }[]

        if (namesSnapshot && namesSnapshot.length > 0) {
          svcList = namesSnapshot.map((name) => ({ name, category_color: null }))
        } else if (aptLines.length > 0) {
          const lineSvcIds = aptLines
            .map((l: { service_id: string | null }) => l.service_id)
            .filter((id): id is string => !!id)
          svcList = buildSvcList(lineSvcIds)
        } else {
          const raw = a.service_ids
          let ids: string[] = []
          if (Array.isArray(raw)) {
            ids = raw
          } else if (typeof raw === 'string' && raw.length > 0) {
            ids = raw
              .replace(/^\{|\}$/g, '')
              .split(',')
              .map((s) => s.trim())
              .filter((s) => s.length > 0)
          }
          if (!ids.length && a.service_id) ids = [a.service_id]
          svcList = buildSvcList(ids)
        }

        const emp = a.employee_id ? empMap.get(a.employee_id) : undefined

        return {
          id: a.id,
          date: a.date,
          status: a.status,
          price: a.price,
          employee_name: emp?.name ?? null,
          employee_color: emp?.color ?? null,
          services: svcList,
          total_paid: totalPaid,
          pending_amount: Math.max(0, price - totalPaid),
        }
      })
    },
  })
}
