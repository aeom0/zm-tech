'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'

import { useCategorias } from '@/hooks/servicios/useCategorias'
import { useServicios } from '@/hooks/servicios/useServicios'
import { useEmployeeServiceIds, useSaveEmployeeServices } from '@/hooks/personal/useAvailability'
import type { EmployeeRow } from '@/hooks/personal/types'
import { StateNote } from '@/components/ui/StateNote'
import { primaryBtnClass } from './availabilityUi'

export function ServicesTab({ employee, staffSingular }: { employee: EmployeeRow; staffSingular: string }) {
  const categories = useCategorias()
  const services = useServicios()
  const current = useEmployeeServiceIds(employee.id)
  const save = useSaveEmployeeServices(employee.id)

  const [doesAll, setDoesAll] = useState(employee.does_all_services)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (current.data) setSelected(new Set(current.data))
  }, [current.data])
  useEffect(() => setDoesAll(employee.does_all_services), [employee.does_all_services])

  const grouped = useMemo(() => {
    const active = (services.data ?? []).filter((s) => s.is_active)
    return (categories.data ?? [])
      .map((c) => ({ category: c, items: active.filter((s) => s.category_id === c.id) }))
      .filter((g) => g.items.length > 0)
  }, [categories.data, services.data])

  const toggle = (id: string) => {
    setSaved(false)
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleCategory = (ids: string[]) => {
    setSaved(false)
    setSelected((prev) => {
      const next = new Set(prev)
      const all = ids.every((id) => next.has(id))
      ids.forEach((id) => (all ? next.delete(id) : next.add(id)))
      return next
    })
  }

  if (categories.isLoading || services.isLoading || current.isLoading) {
    return <StateNote kind="loading">Cargando servicios…</StateNote>
  }
  if (current.isError || !current.data) {
    return (
      <StateNote kind="error">
        No se pudieron cargar los servicios. Recarga antes de guardar, para no borrar la lista.
      </StateNote>
    )
  }

  const missingSelection = !doesAll && selected.size === 0

  return (
    <div className="space-y-4">
      <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-2xl border border-fg/[0.08] bg-card px-4 py-3">
        <input
          type="checkbox"
          checked={doesAll}
          onChange={(e) => {
            setDoesAll(e.target.checked)
            setSaved(false)
          }}
          className="h-5 w-5 accent-[var(--tenant-primary)]"
        />
        <span>
          <span className="block text-sm font-semibold text-fg">Hace todos los servicios</span>
          <span className="block text-xs text-fg-subtle">
            Incluye los servicios nuevos que agregues después.
          </span>
        </span>
      </label>

      {!doesAll && (
        <div className="space-y-3">
          {grouped.map(({ category, items }) => {
            const ids = items.map((s) => s.id)
            const count = ids.filter((id) => selected.has(id)).length
            return (
              <div key={category.id} className="rounded-2xl border border-fg/[0.08] bg-card">
                <label className="flex min-h-[44px] cursor-pointer items-center gap-3 border-b border-fg/[0.08] px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={count === ids.length}
                    ref={(el) => {
                      if (el) el.indeterminate = count > 0 && count < ids.length
                    }}
                    onChange={() => toggleCategory(ids)}
                    className="h-5 w-5 accent-[var(--tenant-primary)]"
                  />
                  <span className="flex-1 text-sm font-semibold text-fg">{category.name}</span>
                  <span className="text-xs text-fg-subtle">
                    {count}/{ids.length}
                  </span>
                </label>
                <ul className="divide-y divide-fg/[0.06]">
                  {items.map((s) => (
                    <li key={s.id}>
                      <label className="flex min-h-[44px] cursor-pointer items-center gap-3 px-4 py-2">
                        <input
                          type="checkbox"
                          checked={selected.has(s.id)}
                          onChange={() => toggle(s.id)}
                          className="h-5 w-5 accent-[var(--tenant-primary)]"
                        />
                        <span className="flex-1 text-sm text-fg">{s.name}</span>
                        <span className="text-xs text-fg-subtle">{s.duration} min</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
          {grouped.length === 0 && <StateNote kind="empty">Aún no hay servicios activos.</StateNote>}
        </div>
      )}

      {missingSelection && (
        <StateNote kind="warning">
          Sin servicios marcados, {staffSingular.toLowerCase()} no recibirá citas.
        </StateNote>
      )}
      {save.error && <StateNote kind="error">{(save.error as Error).message}</StateNote>}

      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="inline-flex items-center gap-1 text-xs text-fg-subtle">
            <Check className="h-4 w-4" /> Guardado
          </span>
        )}
        <button
          type="button"
          className={primaryBtnClass}
          disabled={save.isPending || !current.isSuccess}
          onClick={() =>
            save.mutate(
              { doesAll, serviceIds: Array.from(selected) },
              { onSuccess: () => setSaved(true) }
            )
          }
        >
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar servicios
        </button>
      </div>
    </div>
  )
}
