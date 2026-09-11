'use client'

import { Plus } from 'lucide-react'

import type { EmployeeRow } from '@/hooks/personal/types'
import { formatDashboardCurrency } from '@/lib/dashboardCurrency'

interface EmployeeCardProps {
  employee: EmployeeRow
  currencyCode: string
  showGeemaExtras: boolean
  onClick: () => void
}

function paymentLabel(
  emp: EmployeeRow,
  currencyCode: string,
  showGeemaExtras: boolean
): string {
  if (
    (emp.payment_mode === 'commission' || emp.payment_mode === 'mixed' || !showGeemaExtras) &&
    emp.commission_mode === 'fixed_house'
  ) {
    return `Casa ${formatDashboardCurrency(emp.house_cut_fixed ?? 0, currencyCode)}`
  }
  if (showGeemaExtras && emp.payment_mode === 'salary') return 'Salario fijo'
  if (showGeemaExtras && emp.payment_mode === 'mixed') {
    return `Mixto · ${emp.commission_percentage ?? 0}%`
  }
  return `${emp.commission_percentage ?? 0}%`
}

export function EmployeeCard({
  employee,
  currencyCode,
  showGeemaExtras,
  onClick,
}: EmployeeCardProps) {
  const initial = employee.name.charAt(0).toUpperCase() || '?'
  const pay = paymentLabel(employee, currencyCode, showGeemaExtras)

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-left transition-colors hover:border-white/[0.14] hover:bg-white/[0.04]"
    >
      <div
        className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/[0.08] text-sm font-bold text-white"
        style={{ backgroundColor: `${employee.color}33` }}
      >
        {employee.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={employee.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span style={{ color: employee.color }}>{initial}</span>
        )}
        <span
          className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-zinc-950"
          style={{ backgroundColor: employee.color }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-white">{employee.name}</span>
          {!employee.is_active && (
            <span className="rounded-full border border-white/[0.08] bg-white/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
              Inactivo
            </span>
          )}
        </div>
        <div className="mt-0.5 truncate text-xs text-zinc-400">
          {employee.phone || employee.email || 'Sin contacto'}
        </div>
        <div className="mt-1 text-xs text-[#40E0D0]">{pay}</div>
      </div>
    </button>
  )
}

interface PersonalHeaderActionsProps {
  onNew: () => void
  staffSingular: string
}

export function PersonalHeaderActions({ onNew, staffSingular }: PersonalHeaderActionsProps) {
  return (
    <button
      type="button"
      onClick={onNew}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#40E0D0] px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-[#00897B] hover:text-white"
    >
      <Plus className="h-4 w-4" />
      Nuevo {staffSingular.toLowerCase()}
    </button>
  )
}
