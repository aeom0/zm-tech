'use client'

import { useState } from 'react'
import { CalendarClock, ListChecks, UserX, X } from 'lucide-react'

import type { EmployeeRow } from '@/hooks/personal/types'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ScheduleTab } from './ScheduleTab'
import { ServicesTab } from './ServicesTab'
import { TimeOffTab } from './TimeOffTab'

type Tab = 'services' | 'schedule' | 'timeoff'

interface AvailabilityModalProps {
  employee: EmployeeRow | null
  employees: EmployeeRow[]
  staffSingular: string
  timezone?: string | null
  /** Muestra solo esa sección (sin pestañas): se usa desde las pantallas del equipo. */
  only?: Tab
  /** Si se pasa, el encabezado permite cambiar de profesional. */
  onSwitch?: (employee: EmployeeRow) => void
  onClose: () => void
}

/** Ficha de disponibilidad: qué servicios hace, cuándo trabaja y cuándo falta (Plan 18). */
export function AvailabilityModal({
  employee,
  employees,
  staffSingular,
  timezone,
  only,
  onSwitch,
  onClose,
}: AvailabilityModalProps) {
  const [pickedTab, setTab] = useState<Tab>('services')
  if (!employee) return null
  const tab = only ?? pickedTab
  const activeEmployees = employees.filter((e) => e.is_active || e.id === employee.id)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-scrim/60" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-fg/[0.08] bg-sunken sm:rounded-3xl">
        <header className="flex items-center justify-between border-b border-fg/[0.08] px-5 py-4">
          <div>
            <div className="text-xs text-fg-subtle">
              {only === 'services' ? 'Servicios' : only === 'schedule' ? 'Horario' : only === 'timeoff' ? 'Ausencias' : 'Disponibilidad'}
            </div>
            {onSwitch ? (
              <select
                aria-label={`Elegir ${staffSingular.toLowerCase()}`}
                value={employee.id}
                onChange={(e) => {
                  const next = activeEmployees.find((x) => x.id === e.target.value)
                  if (next) onSwitch(next)
                }}
                className="mt-0.5 rounded-lg border border-fg/[0.08] bg-fg/[0.04] px-2 py-1 text-lg font-bold text-fg"
              >
                {activeEmployees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            ) : (
              <h2 className="text-lg font-bold text-fg">{employee.name}</h2>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-fg/[0.08] bg-fg/[0.04] md:h-9 md:w-9"
          >
            <X className="h-4 w-4 text-fg-soft" />
          </button>
        </header>
        {!only && (
        <div className="border-b border-fg/[0.08] px-5 py-3">
          <SegmentedControl<Tab>
            ariaLabel="Secciones de disponibilidad"
            value={tab}
            onChange={setTab}
            className="!w-full"
            options={[
              { value: 'services', label: 'Servicios', icon: <ListChecks className="h-4 w-4" /> },
              { value: 'schedule', label: 'Horario', icon: <CalendarClock className="h-4 w-4" /> },
              { value: 'timeoff', label: 'Ausencias', icon: <UserX className="h-4 w-4" /> },
            ]}
          />
        </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {tab === 'services' && <ServicesTab key={employee.id} employee={employee} staffSingular={staffSingular} />}
          {tab === 'schedule' && <ScheduleTab key={employee.id} employee={employee} staffSingular={staffSingular} />}
          {tab === 'timeoff' && (
            <TimeOffTab
              key={employee.id}
              employee={employee}
              employees={employees}
              staffSingular={staffSingular}
              timezone={timezone}
            />
          )}
        </div>
      </div>
    </div>
  )
}
