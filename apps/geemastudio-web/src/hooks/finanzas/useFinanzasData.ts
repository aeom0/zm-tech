'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { LUNARIS } from '@/lib/theme'

export interface PaymentRow {
  id: string
  amount: string
  method: string
  date: string
  notes: string | null
  is_abono: boolean
  service_total: string | null
  appointment_id: string | null
  client_name: string | null
  apt_price: string | null
  service_name: string | null
  employee_name: string | null
  employee_color: string | null
}

export interface EmployeeDesglose {
  id: string
  name: string
  color: string
  generado: number
  pagado: number
  pendiente: number
}

export interface FinanzasData {
  payments: PaymentRow[]
  totalMes: number
  totalAbonos: number
  pendienteMes: number
  citasConPendiente: number
  desgloseChicas: EmployeeDesglose[]
  isLoading: boolean
}

export function useFinanzasData(): FinanzasData {
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [rawAppointments, setRawAppointments] = useState<
    {
      id: string
      employee_id: string | null
      price: string
      employee_name: string | null
      employee_color: string | null
    }[]
  >([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!supabase) return
    const sb = supabase

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const fetchAll = async () => {
      setIsLoading(true)
      try {
        // Pagos del mes con joins
        const { data: pData } = await sb
          .from('payments')
          .select(
            `
            id, amount, method, date, notes, is_abono, service_total, appointment_id,
            appointments (
              client_name, price,
              services ( name ),
              employees ( name, color )
            )
          `
          )
          .gte('date', startOfMonth.toISOString())
          .order('date', { ascending: false })

        type PaymentJoinRow = {
          id: string
          amount: string
          method: string
          date: string
          notes: string | null
          is_abono: boolean
          service_total: string | null
          appointment_id: string | null
          appointments:
            | {
                client_name: string | null
                price: string | null
                services: { name: string } | { name: string }[] | null
                employees:
                  | { name: string; color: string | null }
                  | { name: string; color: string | null }[]
                  | null
              }
            | {
                client_name: string | null
                price: string | null
                services: { name: string } | { name: string }[] | null
                employees:
                  | { name: string; color: string | null }
                  | { name: string; color: string | null }[]
                  | null
              }[]
            | null
        }

        const mapped: PaymentRow[] = ((pData ?? []) as PaymentJoinRow[]).map((p) => {
          const apt = Array.isArray(p.appointments) ? p.appointments[0] : p.appointments
          return {
            id: p.id,
            amount: p.amount,
            method: p.method,
            date: p.date,
            notes: p.notes,
            is_abono: p.is_abono,
            service_total: p.service_total,
            appointment_id: p.appointment_id,
            client_name: apt?.client_name ?? null,
            apt_price: apt?.price ?? null,
            service_name:
              (Array.isArray(apt?.services) ? apt.services[0] : apt?.services)?.name ?? null,
            employee_name:
              (Array.isArray(apt?.employees) ? apt.employees[0] : apt?.employees)?.name ?? null,
            employee_color:
              (Array.isArray(apt?.employees) ? apt.employees[0] : apt?.employees)?.color ?? null,
          }
        })
        setPayments(mapped)

        // Citas del mes para desglose por chica
        const { data: aData } = await sb
          .from('appointments')
          .select('id, employee_id, price, employees(name, color)')
          .gte('date', startOfMonth.toISOString())

        type AppointmentJoinRow = {
          id: string
          employee_id: string | null
          price: string
          employees:
            { name: string; color: string | null } | { name: string; color: string | null }[] | null
        }

        setRawAppointments(
          ((aData ?? []) as AppointmentJoinRow[]).map((a) => {
            const emp = Array.isArray(a.employees) ? a.employees[0] : a.employees
            return {
              id: a.id,
              employee_id: a.employee_id,
              price: a.price,
              employee_name: emp?.name ?? null,
              employee_color: emp?.color ?? null,
            }
          })
        )
      } finally {
        setIsLoading(false)
      }
    }

    fetchAll()
  }, [])

  const totalMes = useMemo(() => payments.reduce((s, p) => s + parseFloat(p.amount), 0), [payments])

  // Abonos por cita: cuánto se pagó de adelanto y cuál es el service_total
  const abonoPorCita = useMemo(() => {
    const map: Record<string, { pagado: number; total: number }> = {}
    for (const p of payments) {
      if (p.is_abono && p.appointment_id && p.service_total) {
        const t = parseFloat(p.service_total)
        const a = parseFloat(p.amount)
        if (!Number.isNaN(t) && !Number.isNaN(a)) {
          map[p.appointment_id] = { pagado: a, total: t }
        }
      }
    }
    return map
  }, [payments])

  const totalAbonos = useMemo(
    () => payments.filter((p) => p.is_abono).reduce((s, p) => s + parseFloat(p.amount), 0),
    [payments]
  )

  // Pagado total por cita (incluyendo abonos + pagos completos)
  const pagadoPorCita = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of payments) {
      if (!p.appointment_id) continue
      map[p.appointment_id] = (map[p.appointment_id] ?? 0) + parseFloat(p.amount)
    }
    return map
  }, [payments])

  // Pendiente total del mes: suma de (price_cita - pagado) para citas con pago parcial
  const { pendienteMes, citasConPendiente } = useMemo(() => {
    let pendiente = 0
    let count = 0
    for (const apt of rawAppointments) {
      const pagado = pagadoPorCita[apt.id] ?? 0
      const abono = abonoPorCita[apt.id]
      const total = abono ? abono.total : parseFloat(apt.price)
      const rest = total - pagado
      if (rest > 0.01 && pagado > 0) {
        pendiente += rest
        count++
      }
    }
    return { pendienteMes: pendiente, citasConPendiente: count }
  }, [rawAppointments, pagadoPorCita, abonoPorCita])

  // Desglose por chica
  const desgloseChicas = useMemo(() => {
    const byEmp: Record<string, EmployeeDesglose> = {}
    for (const apt of rawAppointments) {
      if (!apt.employee_id) continue
      if (!byEmp[apt.employee_id]) {
        byEmp[apt.employee_id] = {
          id: apt.employee_id,
          name: apt.employee_name ?? apt.employee_id,
          color: apt.employee_color ?? LUNARIS.primaryDark,
          generado: 0,
          pagado: 0,
          pendiente: 0,
        }
      }
      const abono = abonoPorCita[apt.id]
      const total = abono ? abono.total : parseFloat(apt.price)
      const pagado = pagadoPorCita[apt.id] ?? 0
      byEmp[apt.employee_id].generado += total
      byEmp[apt.employee_id].pagado += pagado
      byEmp[apt.employee_id].pendiente += Math.max(0, total - pagado)
    }
    return Object.values(byEmp).filter((e) => e.generado > 0)
  }, [rawAppointments, pagadoPorCita, abonoPorCita])

  return {
    payments,
    totalMes,
    totalAbonos,
    pendienteMes,
    citasConPendiente,
    desgloseChicas,
    isLoading,
  }
}
