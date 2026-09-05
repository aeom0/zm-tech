'use client'

import { useEffect, useState, useMemo } from 'react'
import { calculateEmployeeEarnings } from '@geemastudio/shared-schema'
import { supabase } from '@/lib/supabase'
import { LUNARIS } from '@/lib/theme'
import { usePayouts } from './usePayouts'

export type FinanzasPeriod = 'day' | 'week' | 'month'

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
  comision: number
  comisionPagada: number
  comisionPendienteReal: number
  commissionLabel?: string
}

export interface FinanzasData {
  payments: PaymentRow[]
  totalMes: number
  totalAbonos: number
  pendienteMes: number
  citasConPendiente: number
  desgloseChicas: EmployeeDesglose[]
  isLoading: boolean
  period: FinanzasPeriod
  setPeriod: (p: FinanzasPeriod) => void
  periodStart: string
  periodEnd: string
  registerPayout: ReturnType<typeof usePayouts>['registerPayout']
  isRegisteringPayout: boolean
  payoutError: Error | null
  refetchPayouts: () => void
}

type EmployeeCommissionRow = {
  id: string
  name: string
  color: string | null
  role: string
  payment_mode: 'commission' | 'salary' | 'mixed' | null
  commission_mode: 'percent' | 'fixed_house' | null
  commission_percentage: number | null
  house_cut_fixed: number | null
  salary_amount: string | null
}

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function addDays(d: Date, n: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function startOfWeek(d: Date) {
  const x = startOfDay(d)
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  return addDays(x, diff)
}

function startOfMonth(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1)
  x.setHours(0, 0, 0, 0)
  return x
}

function buildRange(period: FinanzasPeriod): { start: Date; end: Date } {
  const now = new Date()
  if (period === 'day') {
    const s = startOfDay(now)
    return { start: s, end: addDays(s, 1) }
  }
  if (period === 'week') {
    const s = startOfWeek(now)
    return { start: s, end: addDays(s, 7) }
  }
  const s = startOfMonth(now)
  return { start: s, end: new Date(s.getFullYear(), s.getMonth() + 1, 1) }
}

function toDateOnly(d: Date) {
  return d.toISOString().slice(0, 10)
}

export function useFinanzasData(): FinanzasData {
  const [period, setPeriod] = useState<FinanzasPeriod>('month')
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
  const [appointmentServices, setAppointmentServices] = useState<
    { appointment_id: string; service_id: string; employee_id: string | null; price: string }[]
  >([])
  const [employeesFull, setEmployeesFull] = useState<EmployeeCommissionRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const range = useMemo(() => buildRange(period), [period])
  const periodStart = useMemo(() => toDateOnly(range.start), [range])
  const periodEnd = useMemo(() => toDateOnly(addDays(range.end, -1)), [range])
  /** Días del período, para prorratear salary_amount (asumido mensual). */
  const periodDays = useMemo(
    () => Math.max(1, Math.round((range.end.getTime() - range.start.getTime()) / 86400000)),
    [range]
  )

  const {
    payoutsByEmployee,
    registerPayout,
    isRegistering,
    registerError,
    refetch: refetchPayouts,
  } = usePayouts(periodStart, periodEnd)

  useEffect(() => {
    if (!supabase) return
    const sb = supabase

    const fetchAll = async () => {
      setIsLoading(true)
      try {
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
          .gte('date', range.start.toISOString())
          .lt('date', range.end.toISOString())
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

        const { data: aData } = await sb
          .from('appointments')
          .select('id, employee_id, price, employees(name, color)')
          .gte('date', range.start.toISOString())
          .lt('date', range.end.toISOString())

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

        const { data: asData } = await sb
          .from('appointment_services')
          .select('appointment_id, service_id, employee_id, price, appointments!inner(date)')
          .gte('appointments.date', range.start.toISOString())
          .lt('appointments.date', range.end.toISOString())
        setAppointmentServices(
          ((asData ?? []) as { appointment_id: string; service_id: string; employee_id: string | null; price: string }[]).map(
            (l) => ({
              appointment_id: l.appointment_id,
              service_id: l.service_id,
              employee_id: l.employee_id,
              price: l.price,
            })
          )
        )

        const { data: eData } = await sb
          .from('employees')
          .select(
            'id, name, color, role, payment_mode, commission_mode, commission_percentage, house_cut_fixed, salary_amount'
          )
        setEmployeesFull((eData ?? []) as EmployeeCommissionRow[])
      } finally {
        setIsLoading(false)
      }
    }

    fetchAll()
  }, [range])

  const totalMes = useMemo(() => payments.reduce((s, p) => s + parseFloat(p.amount), 0), [payments])

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

  const pagadoPorCita = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of payments) {
      if (!p.appointment_id) continue
      map[p.appointment_id] = (map[p.appointment_id] ?? 0) + parseFloat(p.amount)
    }
    return map
  }, [payments])

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

  const comisionByEmployee = useMemo(() => {
    const map: Record<string, { comision: number; houseCutEarned: number }> = {}
    if (employeesFull.length === 0) return map
    for (const e of employeesFull) map[e.id] = { comision: 0, houseCutEarned: 0 }

    const linesByAppointment: Record<string, typeof appointmentServices> = {}
    for (const line of appointmentServices) {
      ;(linesByAppointment[line.appointment_id] ??= []).push(line)
    }

    let totalHouseCuts = 0
    const totalGeneradoByEmp: Record<string, number> = {}

    for (const apt of rawAppointments) {
      const lines = linesByAppointment[apt.id] ?? []
      if (lines.length > 0) {
        for (const line of lines) {
          const eid = line.employee_id
          const emp = employeesFull.find((e) => e.id === eid)
          if (!eid || !emp) continue
          const linePrice = parseFloat(String(line.price))
          totalGeneradoByEmp[eid] = (totalGeneradoByEmp[eid] ?? 0) + linePrice
          const paymentMode = emp.payment_mode ?? 'commission'
          const commissionMode = emp.commission_mode ?? 'percent'
          if (paymentMode !== 'salary' && commissionMode === 'fixed_house') {
            const house = Math.min(emp.house_cut_fixed ?? 0, linePrice)
            map[eid].comision += linePrice - house
            totalHouseCuts += house
          }
        }
      } else {
        const eid = apt.employee_id
        const emp = eid ? employeesFull.find((e) => e.id === eid) : undefined
        if (!eid || !emp) continue
        const price = parseFloat(apt.price)
        totalGeneradoByEmp[eid] = (totalGeneradoByEmp[eid] ?? 0) + price
        const paymentMode = emp.payment_mode ?? 'commission'
        const commissionMode = emp.commission_mode ?? 'percent'
        if (paymentMode !== 'salary' && commissionMode === 'fixed_house') {
          const house = Math.min(emp.house_cut_fixed ?? 0, price)
          map[eid].comision += price - house
          totalHouseCuts += house
        }
      }
    }

    for (const emp of employeesFull) {
      const paymentMode = emp.payment_mode ?? 'commission'
      const commissionMode = emp.commission_mode ?? 'percent'
      if (paymentMode !== 'salary' && commissionMode === 'fixed_house') continue
      const generado = totalGeneradoByEmp[emp.id] ?? 0
      const commissionPercentage =
        paymentMode === 'salary'
          ? null
          : emp.commission_percentage != null
            ? Number(emp.commission_percentage)
            : null
      const salaryAmount = emp.salary_amount ? parseFloat(emp.salary_amount) : null
      const res = calculateEmployeeEarnings({
        paymentAmount: generado,
        paymentMode,
        commissionPercentage,
        salaryAmount,
        commissionMode,
        houseCutFixed: emp.house_cut_fixed,
        periodDays,
      })
      map[emp.id].comision = res.employeeEarns
    }

    if (totalHouseCuts > 0) {
      const owner =
        employeesFull.find((e) => e.role === 'owner') ??
        employeesFull.find((e) => e.name.toLowerCase().includes('vanessa'))
      if (owner && map[owner.id]) {
        map[owner.id].comision += totalHouseCuts
        map[owner.id].houseCutEarned = totalHouseCuts
      }
    }

    return map
  }, [employeesFull, appointmentServices, rawAppointments, periodDays])

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
          comision: 0,
          comisionPagada: 0,
          comisionPendienteReal: 0,
        }
      }
      const abono = abonoPorCita[apt.id]
      const total = abono ? abono.total : parseFloat(apt.price)
      const pagado = pagadoPorCita[apt.id] ?? 0
      byEmp[apt.employee_id].generado += total
      byEmp[apt.employee_id].pagado += pagado
      byEmp[apt.employee_id].pendiente += Math.max(0, total - pagado)
    }

    for (const emp of employeesFull) {
      const commissionRow = comisionByEmployee[emp.id]
      if (!commissionRow || commissionRow.comision <= 0) continue
      if (!byEmp[emp.id]) {
        byEmp[emp.id] = {
          id: emp.id,
          name: emp.name,
          color: emp.color ?? LUNARIS.primaryDark,
          generado: 0,
          pagado: 0,
          pendiente: 0,
          comision: 0,
          comisionPagada: 0,
          comisionPendienteReal: 0,
        }
      }
      const comisionPagada = payoutsByEmployee[emp.id] ?? 0
      byEmp[emp.id].comision = commissionRow.comision
      byEmp[emp.id].comisionPagada = comisionPagada
      byEmp[emp.id].comisionPendienteReal = Math.max(0, commissionRow.comision - comisionPagada)
      byEmp[emp.id].commissionLabel =
        (emp.payment_mode ?? 'commission') === 'salary'
          ? 'Salario fijo'
          : emp.commission_mode === 'fixed_house'
            ? `Comisión (casa ${emp.house_cut_fixed ?? 0})`
            : undefined
    }

    return Object.values(byEmp).filter((e) => e.generado > 0 || e.comision > 0)
  }, [rawAppointments, pagadoPorCita, abonoPorCita, employeesFull, comisionByEmployee, payoutsByEmployee])

  return {
    payments,
    totalMes,
    totalAbonos,
    pendienteMes,
    citasConPendiente,
    desgloseChicas,
    isLoading,
    period,
    setPeriod,
    periodStart,
    periodEnd,
    registerPayout,
    isRegisteringPayout: isRegistering,
    payoutError: registerError,
    refetchPayouts: () => void refetchPayouts(),
  }
}
