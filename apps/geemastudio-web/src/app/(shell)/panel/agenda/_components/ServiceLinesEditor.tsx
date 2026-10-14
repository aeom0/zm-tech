'use client'

import { Plus, Trash2 } from 'lucide-react'
import {
  EMPTY_ELIGIBILITY,
  employeeCanDoService,
  type AgendaService,
  type AgendaServiceLine,
  type ServiceEligibilityIndex,
} from '@geemastudio/data'

import { formatDashboardCurrency } from '@/lib/dashboardCurrency'

const selectClass =
  'w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-fg outline-none focus:border-[var(--tenant-primary)]'

interface ServiceLinesEditorProps {
  lines: AgendaServiceLine[]
  onChange: (lines: AgendaServiceLine[]) => void
  services: AgendaService[]
  employees: { id: string; name: string }[]
  /** Día de la cita (YYYY-MM-DD) para coberturas. */
  day: string
  eligibility?: ServiceEligibilityIndex
  currencyCode: string
  staffLabel?: string
}

/**
 * Líneas servicio + profesional de una cita. Solo ofrece profesionales que hacen
 * el servicio (o lo cubren ese día); la elección actual siempre se mantiene.
 */
export function ServiceLinesEditor({
  lines,
  onChange,
  services,
  employees,
  day,
  eligibility = EMPTY_ELIGIBILITY,
  currencyCode,
  staffLabel = 'Profesional',
}: ServiceLinesEditorProps) {
  const activeServices = services.filter((s) => s.is_active !== false)

  const eligibleFor = (serviceId: string, currentId: string) => {
    const canDo = (id: string) => employeeCanDoService(eligibility, id, serviceId, day)
    // Sin datos de elegibilidad (o nadie configurado para el servicio): no se filtra.
    if (!employees.some((e) => canDo(e.id))) return employees
    return employees.filter((e) => e.id === currentId || canDo(e.id))
  }

  const update = (index: number, patch: Partial<AgendaServiceLine>) => {
    onChange(
      lines.map((line, i) => {
        if (i !== index) return line
        const next = { ...line, ...patch }
        // Al cambiar de servicio, si el profesional ya no aplica, se toma el primero que sí.
        if (patch.serviceId && next.employeeId) {
          const ok = employeeCanDoService(eligibility, next.employeeId, next.serviceId, day)
          if (!ok) {
            const first = eligibleFor(next.serviceId, '')[0]
            if (first) next.employeeId = first.id
          }
        }
        return next
      })
    )
  }

  const add = () => {
    const svc = activeServices[0]
    if (!svc) return
    const emp = eligibleFor(svc.id, '')[0]
    onChange([...lines, { serviceId: svc.id, employeeId: emp?.id ?? '' }])
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-fg-soft">Servicios ({lines.length})</span>
        <button
          type="button"
          onClick={add}
          className="inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2 text-xs font-semibold text-[var(--tenant-primary)] hover:bg-fg/[0.04]"
        >
          <Plus className="h-3.5 w-3.5" /> Agregar servicio
        </button>
      </div>

      <ul className="space-y-2">
        {lines.map((line, idx) => {
          const svc = services.find((s) => s.id === line.serviceId)
          const svcOptions =
            svc && svc.is_active === false ? [svc, ...activeServices] : activeServices
          return (
            <li
              key={idx}
              className="flex items-start gap-2 rounded-xl border border-line bg-fg/[0.02] p-2.5"
            >
              <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_11rem]">
                <select
                  aria-label={`Servicio ${idx + 1}`}
                  value={line.serviceId}
                  onChange={(e) => update(idx, { serviceId: e.target.value })}
                  className={selectClass}
                >
                  {svcOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {s.duration} min · {formatDashboardCurrency(Number(s.price) || 0, currencyCode)}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={`${staffLabel} ${idx + 1}`}
                  value={line.employeeId}
                  onChange={(e) => update(idx, { employeeId: e.target.value })}
                  className={selectClass}
                >
                  {!line.employeeId && <option value="">Sin asignar</option>}
                  {eligibleFor(line.serviceId, line.employeeId).map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>
              {lines.length > 1 && (
                <button
                  type="button"
                  onClick={() => onChange(lines.filter((_, i) => i !== idx))}
                  aria-label={`Quitar servicio ${idx + 1}`}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-fg-subtle hover:bg-red-500/10 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
