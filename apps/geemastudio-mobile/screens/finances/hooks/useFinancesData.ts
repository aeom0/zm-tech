import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { calculateEmployeeEarnings } from '@geemastudio/shared-schema'
import { fetchEmployeeById } from '@/screens/personal/lib/employeesAdapter'
import { useEmployeesQuery } from '@/screens/personal/hooks/useEmployeesData'

import { buildTopServicesRanking, type ServiceRankRow } from '../utils/service-ranking'
import type {
  FinancesAppointmentOption,
  FinancesDesgloseRow,
  FinancesEmployeeOption,
  FinancesPayment,
  FinancesPeriod,
  FinancesServiceOption,
} from '../types'

export { buildFinancesDateRanges } from '../lib/billingMonth'

type AppointmentInPeriod = {
  id: string
  employee_id: string | null
  price: string
  status: string
  appointment_services: {
    service_id: string
    employee_id: string | null
    price: string
    pack_id?: string | null
  }[]
}

export function useFinancesData(
  period: FinancesPeriod,
  currentRange: { start: string; end: string }
) {
  const { isAdmin, userId } = useAuth()

  const {
    data: payments = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<FinancesPayment[]>({
    queryKey: ['payments', currentRange.start, currentRange.end, isAdmin ? 'admin' : userId],
    queryFn: async () => {
      let query = supabase
        .from('payments')
        .select('id, appointment_id, amount, method, date, notes, is_abono, service_total')
        .gte('date', currentRange.start)
        .lte('date', currentRange.end)
        .order('date', { ascending: false })

      if (!isAdmin && userId) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('employee_id')
          .eq('id', userId)
          .maybeSingle()

        if (prof?.employee_id) {
          const { data: aptIds, error: aptError } = await supabase
            .from('appointments')
            .select('id')
            .eq('employee_id', prof.employee_id)
          if (aptError) throw new Error(aptError.message)
          const ids = (aptIds ?? []).map((a) => a.id)
          if (ids.length > 0) {
            query = query.in('appointment_id', ids)
          } else {
            return []
          }
        }
      }

      const { data, error } = await query
      if (error) throw new Error(error.message)
      return (data ?? []) as FinancesPayment[]
    },
  })

  const { data: recentAppointments = [] } = useQuery<FinancesAppointmentOption[]>({
    queryKey: ['finances_recent_appointments', isAdmin ? 'admin' : userId],
    queryFn: async () => {
      let q = supabase
        .from('appointments')
        .select('id, client_name, date, status, price, service_id, employee_id')
        .order('date', { ascending: false })
        .limit(100)

      if (!isAdmin && userId) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('employee_id')
          .eq('id', userId)
          .maybeSingle()
        if (prof?.employee_id) {
          q = q.eq('employee_id', prof.employee_id)
        }
      }

      const { data, error } = await q
      if (error) throw new Error(error.message)
      return (data ?? []) as FinancesAppointmentOption[]
    },
  })

  const { data: servicesList = [] } = useQuery<FinancesServiceOption[]>({
    queryKey: ['finances_services'],
    queryFn: async () => {
      const { data, error } = await supabase.from('services').select('id, name')
      if (error) throw new Error(error.message)
      return (data ?? []) as FinancesServiceOption[]
    },
  })

  const { data: employeesList = [] } = useEmployeesQuery({ enabled: isAdmin })

  const { data: myEmployee = null } = useQuery<FinancesEmployeeOption | null>({
    queryKey: ['my_employee', userId],
    enabled: !isAdmin && !!userId,
    queryFn: async () => {
      const { data: prof, error: profError } = await supabase
        .from('profiles')
        .select('employee_id')
        .eq('id', userId)
        .maybeSingle()
      if (profError) throw new Error(profError.message)
      if (!prof?.employee_id) return null
      return fetchEmployeeById(prof.employee_id)
    },
  })

  const { data: appointmentsInPeriod = [] } = useQuery<AppointmentInPeriod[]>({
    queryKey: ['finances_appointments_in_period', currentRange.start, currentRange.end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select(
          'id, employee_id, price, status, appointment_services(service_id, employee_id, price, pack_id)'
        )
        .gte('date', currentRange.start)
        .lte('date', currentRange.end)
        .neq('status', 'cancelled')
      if (error) throw new Error(error.message)
      return (data ?? []) as AppointmentInPeriod[]
    },
    enabled: isAdmin,
  })

  const { data: packsList = [] } = useQuery({
    queryKey: ['finances_packs'],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from('packs').select('id, title, name')
      if (error) throw new Error(error.message)
      return (data ?? []) as { id: string; title: string | null; name: string | null }[]
    },
  })

  const serviceNameById = useMemo(() => {
    const map: Record<string, string> = {}
    for (const s of servicesList) {
      map[s.id] = s.name
    }
    return map
  }, [servicesList])

  const packNameById = useMemo(() => {
    const map: Record<string, string> = {}
    for (const p of packsList) {
      map[p.id] = (p.title ?? p.name ?? '').trim() || 'Pack'
    }
    return map
  }, [packsList])

  const topServicesRanking = useMemo((): ServiceRankRow[] => {
    if (!isAdmin) return []
    const lines = appointmentsInPeriod
      .filter((apt) => apt.status === 'completed' || apt.status === 'scheduled')
      .flatMap((apt) => apt.appointment_services ?? [])
    return buildTopServicesRanking(lines, serviceNameById, packNameById).slice(0, 8)
  }, [isAdmin, appointmentsInPeriod, serviceNameById, packNameById])

  const abonoPrevioByApt = useMemo(() => {
    const map: Record<string, { amount: number; service_total: number }> = {}
    for (const p of payments) {
      if (p.is_abono && p.appointment_id && p.service_total) {
        const st = parseFloat(String(p.service_total))
        const amt = parseFloat(String(p.amount))
        if (!Number.isNaN(st) && !Number.isNaN(amt)) {
          map[p.appointment_id] = { amount: amt, service_total: st }
        }
      }
    }
    return map
  }, [payments])

  const pendienteByAppointmentId = useMemo(() => {
    const paidByApt: Record<string, number> = {}
    const totalByApt: Record<string, number> = {}
    for (const p of payments) {
      const aid = p.appointment_id
      if (!aid) continue
      const amount = parseFloat(String(p.amount))
      paidByApt[aid] = (paidByApt[aid] ?? 0) + amount
      const serviceTotal =
        p.service_total != null ? parseFloat(String(p.service_total)) : null
      if (
        serviceTotal != null &&
        (totalByApt[aid] == null || serviceTotal > (totalByApt[aid] ?? 0))
      ) {
        totalByApt[aid] = serviceTotal
      }
    }
    for (const apt of recentAppointments) {
      if (totalByApt[apt.id] == null) {
        totalByApt[apt.id] = parseFloat(String(apt.price))
      }
    }
    const pendiente: Record<string, number> = {}
    for (const aid of Object.keys(paidByApt)) {
      const total = totalByApt[aid] ?? 0
      const paid = paidByApt[aid] ?? 0
      const rest = total - paid
      if (rest > 0.01) pendiente[aid] = rest
    }
    return pendiente
  }, [payments, recentAppointments])

  const desglosePorChica = useMemo((): FinancesDesgloseRow[] => {
    if (!isAdmin || employeesList.length === 0) return []

    type Acc = {
      generado: number
      pagado: number
      pendiente: number
      comision: number
      houseCutEarned: number
    }
    const byEmployee: Record<string, Acc> = {}
    for (const emp of employeesList) {
      byEmployee[emp.id] = {
        generado: 0,
        pagado: 0,
        pendiente: 0,
        comision: 0,
        houseCutEarned: 0,
      }
    }

    const paidByApt: Record<string, number> = {}
    for (const p of payments) {
      const aid = p.appointment_id
      if (!aid) continue
      paidByApt[aid] = (paidByApt[aid] ?? 0) + parseFloat(String(p.amount))
    }

    let totalHouseCuts = 0

    for (const apt of appointmentsInPeriod) {
      const lines = apt.appointment_services ?? []
      const totalPaid = paidByApt[apt.id] ?? 0

      if (lines.length > 0) {
        const totalAptPrice = lines.reduce(
          (s, l) => s + parseFloat(String(l.price)),
          0
        )
        for (const line of lines) {
          const eid = line.employee_id
          if (!eid || !byEmployee[eid]) continue
          const emp = employeesList.find((e) => e.id === eid)
          if (!emp) continue
          const linePrice = parseFloat(String(line.price))
          const linePct =
            totalAptPrice > 0 ? linePrice / totalAptPrice : 1 / lines.length
          byEmployee[eid].generado += linePrice
          byEmployee[eid].pagado += totalPaid * linePct
          byEmployee[eid].pendiente += Math.max(0, linePrice - totalPaid * linePct)

          const paymentMode = emp.payment_mode ?? 'commission'
          const commissionMode = emp.commission_mode ?? 'percent'
          if (paymentMode !== 'salary' && commissionMode === 'fixed_house') {
            const house = Math.min(emp.house_cut_fixed ?? 0, linePrice)
            byEmployee[eid].comision += linePrice - house
            totalHouseCuts += house
          }
        }
      } else {
        const eid = apt.employee_id
        if (!eid || !byEmployee[eid]) continue
        const emp = employeesList.find((e) => e.id === eid)
        if (!emp) continue
        const price = parseFloat(String(apt.price))
        byEmployee[eid].generado += price
        byEmployee[eid].pagado += totalPaid
        byEmployee[eid].pendiente += Math.max(0, price - totalPaid)

        const paymentMode = emp.payment_mode ?? 'commission'
        const commissionMode = emp.commission_mode ?? 'percent'
        if (paymentMode !== 'salary' && commissionMode === 'fixed_house') {
          const house = Math.min(emp.house_cut_fixed ?? 0, price)
          byEmployee[eid].comision += price - house
          totalHouseCuts += house
        }
      }
    }

    // Percent / salary / mixed (sin fixed_house por línea)
    for (const emp of employeesList) {
      const rec = byEmployee[emp.id]
      if (!rec) continue
      const paymentMode = emp.payment_mode ?? 'commission'
      const commissionMode = emp.commission_mode ?? 'percent'
      if (paymentMode !== 'salary' && commissionMode === 'fixed_house') continue

      const commissionPercentage =
        paymentMode === 'salary'
          ? null
          : emp.commission_percentage != null
            ? Number(emp.commission_percentage)
            : null
      const salaryAmount = emp.salary_amount
        ? parseFloat(String(emp.salary_amount))
        : null
      const res = calculateEmployeeEarnings({
        paymentAmount: rec.generado,
        paymentMode,
        commissionPercentage,
        salaryAmount,
        commissionMode,
        houseCutFixed: emp.house_cut_fixed,
      })
      rec.comision = res.employeeEarns
    }

    if (totalHouseCuts > 0) {
      const vanessa =
        employeesList.find((e) => e.id === 'emp-vanessa' || e.role === 'owner') ??
        employeesList.find((e) => e.name.toLowerCase().includes('vanessa'))
      if (vanessa && byEmployee[vanessa.id]) {
        byEmployee[vanessa.id].comision += totalHouseCuts
        byEmployee[vanessa.id].houseCutEarned = totalHouseCuts
      }
    }

    return employeesList
      .filter((e) => {
        const r = byEmployee[e.id]
        return r && (r.generado > 0 || r.pagado > 0 || r.comision > 0)
      })
      .map((e) => {
        const r = byEmployee[e.id]
        const commissionMode = e.commission_mode ?? 'percent'
        return {
          id: e.id,
          name: e.name,
          generado: r.generado,
          pagado: r.pagado,
          pendiente: r.pendiente,
          comision: r.comision,
          commissionMode,
          houseCutFixed: e.house_cut_fixed,
          houseCutEarned: r.houseCutEarned,
          commissionLabel:
            commissionMode === 'fixed_house'
              ? `Comisión (casa ${e.house_cut_fixed ?? 0})`
              : undefined,
        }
      })
  }, [isAdmin, employeesList, payments, appointmentsInPeriod])

  const totalRevenue = useMemo(
    () => payments.reduce((sum, p) => sum + parseFloat(String(p.amount)), 0),
    [payments]
  )

  const totalAbono = useMemo(
    () =>
      payments
        .filter((p) => p.is_abono)
        .reduce((sum, p) => sum + parseFloat(String(p.amount)), 0),
    [payments]
  )

  const employeeEarningsTotal = useMemo(() => {
    if (!payments.length || !myEmployee) return 0
    const paymentMode = myEmployee.payment_mode ?? 'commission'
    const commissionPercentage =
      paymentMode === 'salary' ? null : (myEmployee.commission_percentage ?? null)
    const salaryAmount = myEmployee.salary_amount
      ? parseFloat(String(myEmployee.salary_amount))
      : null

    return payments.reduce((sum, p) => {
      const result = calculateEmployeeEarnings({
        paymentAmount: parseFloat(String(p.amount)),
        paymentMode,
        commissionPercentage,
        salaryAmount,
      })
      return sum + result.employeeEarns
    }, 0)
  }, [payments, myEmployee])

  const employeeEarningsAbonoTotal = useMemo(() => {
    if (!myEmployee) return 0
    const paymentMode = myEmployee.payment_mode ?? 'commission'
    const commissionPercentage =
      paymentMode === 'salary' ? null : (myEmployee.commission_percentage ?? null)
    const salaryAmount = myEmployee.salary_amount
      ? parseFloat(String(myEmployee.salary_amount))
      : null

    return payments
      .filter((p) => p.is_abono)
      .reduce((sum, p) => {
        const result = calculateEmployeeEarnings({
          paymentAmount: parseFloat(String(p.amount)),
          paymentMode,
          commissionPercentage,
          salaryAmount,
        })
        return sum + result.employeeEarns
      }, 0)
  }, [payments, myEmployee])

  const chartDataByPeriod = useMemo(() => {
    const days = period === 'month' ? 30 : 7
    const byDate: Record<string, number> = {}
    for (const p of payments) {
      const day = String(p.date).slice(0, 10)
      byDate[day] = (byDate[day] ?? 0) + parseFloat(String(p.amount))
    }
    const sorted = Object.keys(byDate).sort().slice(-days)
    return sorted.map((date) => ({ date, total: byDate[date] }))
  }, [payments, period])

  return {
    payments,
    recentAppointments,
    serviceNameById,
    abonoPrevioByApt,
    pendienteByAppointmentId,
    desglosePorChica,
    topServicesRanking,
    totalRevenue,
    totalAbono,
    employeeEarningsTotal,
    employeeEarningsAbonoTotal,
    chartDataByPeriod,
    isLoading,
    isError,
    refetch,
  }
}
