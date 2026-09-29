'use client'

import { useEffect, useMemo, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'

import { useWabaRules } from '@/hooks/waba/useWabaRules'
import {
  formFromRules,
  patchBasicRules,
  validateBasicRules,
  type BasicRulesForm,
} from './_lib/rules-form'

const inputClass =
  'w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-sm text-white'

export default function PanelWabaReglasPage() {
  const { query, mutation } = useWabaRules()
  const [form, setForm] = useState<BasicRulesForm | null>(null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!query.data) return
    setForm(formFromRules(query.data.rules))
    setStatus('idle')
  }, [query.data])

  const dirty = useMemo(() => {
    if (!form || !query.data) return false
    return JSON.stringify(form) !== JSON.stringify(formFromRules(query.data.rules))
  }, [form, query.data])

  const save = async () => {
    if (!form || !query.data) return
    const error = validateBasicRules(form)
    if (error) {
      setStatus('error')
      setMessage(error)
      return
    }
    setStatus('saving')
    setMessage(null)
    try {
      await mutation.mutateAsync({
        settingsId: query.data.settingsId,
        tenantSlug: query.data.tenantSlug,
        rules: patchBasicRules(query.data.rules, form),
      })
      setStatus('saved')
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'No se pudo guardar.')
    }
  }

  const set = (patch: Partial<BasicRulesForm>) => {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev))
    setStatus('idle')
  }

  const toggleStaff = (categoryId: string, employeeId: string) => {
    setForm((prev) => {
      if (!prev) return prev
      const current = prev.staffByCategory[categoryId] ?? []
      const next = current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId]
      return {
        ...prev,
        staffByCategory: { ...prev.staffByCategory, [categoryId]: next },
      }
    })
    setStatus('idle')
  }

  const snapshot = query.data
  const categories =
    snapshot && form
      ? snapshot.categories.length > 0
        ? snapshot.categories
        : Object.keys(form.staffByCategory).map((id) => ({ id, name: id }))
      : []

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs text-zinc-500">WhatsApp</div>
        <h1 className="text-2xl font-bold text-white">Reglas del bot</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Horario, abono y qué chica atiende cada categoría. El cupo y los medios de pago no se
          modifican aquí. El bot aplica el cambio en unos 5 minutos, sin deploy.
        </p>
      </div>

      {query.isError && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {query.error instanceof Error ? query.error.message : 'No se pudieron cargar las reglas'}
        </div>
      )}

      {query.isLoading && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-8 text-center text-sm text-zinc-500">
          Cargando reglas…
        </div>
      )}

      {form && snapshot && (
        <>
          <section className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
            <h2 className="text-base font-bold text-white">Horario</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TimeField
                label="Lunes a sábado, abre"
                value={form.weekdayOpen}
                onChange={(weekdayOpen) => set({ weekdayOpen })}
              />
              <TimeField
                label="Lunes a sábado, cierra"
                value={form.weekdayClose}
                onChange={(weekdayClose) => set({ weekdayClose })}
              />
              <TimeField
                label="Domingo, abre"
                value={form.sundayOpen}
                onChange={(sundayOpen) => set({ sundayOpen })}
              />
              <TimeField
                label="Domingo, cierra"
                value={form.sundayClose}
                onChange={(sundayClose) => set({ sundayClose })}
              />
            </div>
            <p className="text-xs text-zinc-500">
              Domingo vacío significa que ese día no se agenda.
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-zinc-300">
              <label className="inline-flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.slot00}
                  onChange={(e) => set({ slot00: e.target.checked })}
                />
                Slots en punto (:00)
              </label>
              <label className="inline-flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.slot30}
                  onChange={(e) => set({ slot30: e.target.checked })}
                />
                Slots y media (:30)
              </label>
            </div>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-zinc-500">Horarios extra del domingo</span>
              <input
                className={inputClass}
                value={form.sundayExtra}
                placeholder="13:00"
                onChange={(e) => set({ sundayExtra: e.target.value })}
              />
            </label>
          </section>

          <section className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
            <h2 className="text-base font-bold text-white">Abono</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-zinc-500">
                  Abono fijo sin historial (S/)
                </span>
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={form.fixedAmount}
                  onChange={(e) => set({ fixedAmount: e.target.value })}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-zinc-500">Adelanto del domingo (%)</span>
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={form.sundayPercent}
                  onChange={(e) => set({ sundayPercent: e.target.value })}
                />
              </label>
            </div>
            <label className="inline-flex min-h-11 items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={form.requiresHistoryForRate}
                onChange={(e) => set({ requiresHistoryForRate: e.target.checked })}
              />
              El porcentaje del domingo solo aplica si ya tiene una cita completada
            </label>
          </section>

          <section className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
            <h2 className="text-base font-bold text-white">Chicas por categoría</h2>
            <div className="space-y-4">
              {categories.map((category) => (
                <div key={category.id} className="space-y-2">
                  <h3 className="text-sm text-zinc-200">{category.name}</h3>
                  <div className="flex flex-wrap gap-2">
                    {snapshot.employees.map((employee) => {
                      const selected = (form.staffByCategory[category.id] ?? []).includes(
                        employee.id,
                      )
                      return (
                        <button
                          key={employee.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleStaff(category.id, employee.id)}
                          className={[
                            'min-h-11 rounded-xl border px-3 py-2 text-sm',
                            selected
                              ? 'border-[var(--tenant-primary)]/40 bg-[var(--tenant-primary)]/10 text-[var(--tenant-primary)]'
                              : 'border-white/[0.08] text-zinc-300',
                            employee.isActive ? '' : 'opacity-60',
                          ].join(' ')}
                        >
                          {employee.name}
                          {employee.isActive ? '' : ' (inactiva)'}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void save()}
              disabled={!dirty || status === 'saving'}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--tenant-primary)] px-4 py-2 text-sm font-semibold text-[var(--tenant-on-primary)] disabled:opacity-50"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Guardar reglas
            </button>
            {status === 'saved' && <span className="text-sm text-zinc-400">Guardado.</span>}
            {status === 'error' && message && (
              <span className="text-sm text-red-300">{message}</span>
            )}
            {!dirty && status === 'idle' && (
              <span className="text-sm text-zinc-500">Sin cambios.</span>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      <input
        className={inputClass}
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}
