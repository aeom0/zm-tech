'use client'

import { useState } from 'react'
import { X, Receipt, DollarSign, Calendar, Tag } from 'lucide-react'
import { EXPENSE_CATEGORIES, upsertExpense, type ExpenseCategory } from '@geemastudio/data'
import { formatAppointmentWallclock } from '@zmtech/tenant-config'
import { supabase } from '@/lib/supabase'

/** Montar solo mientras está abierto: el estado del formulario se inicializa al montar. */
interface RegisterExpenseModalProps {
  tenantId: string
  timeZone: string
  currencyCode: string
  onClose: () => void
  onSuccess: () => void
}

export function RegisterExpenseModal({
  tenantId,
  timeZone,
  currencyCode,
  onClose,
  onSuccess,
}: RegisterExpenseModalProps) {
  // Fecha de hoy en la zona del negocio, no en UTC (de noche en LATAM UTC ya es mañana).
  const todayStr = formatAppointmentWallclock(new Date(), timeZone).slice(0, 10)
  const currentMonthStr = `${todayStr.slice(0, 7)}-01`

  const [category, setCategory] = useState<ExpenseCategory>('insumos')
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [expenseMonth, setExpenseMonth] = useState(currentMonthStr)
  const [expenseDate, setExpenseDate] = useState(todayStr)
  const [isEstimated, setIsEstimated] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return

    const parsedAmount = Number.parseFloat(amount.replace(',', '.'))
    if (!label.trim()) {
      setErrorMessage('Ingresa una descripción del gasto')
      return
    }
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Ingresa un monto válido mayor a 0')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      await upsertExpense(supabase, {
        tenantId,
        expense: {
          category,
          label: label.trim(),
          amount: parsedAmount,
          expense_month: expenseMonth,
          expense_date: expenseDate || null,
          is_estimated: isEstimated,
        },
      })
      onSuccess()
      onClose()
    } catch (err) {
      setErrorMessage((err as Error).message || 'Error al guardar el gasto')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-bg-card relative w-full max-w-md rounded-2xl border border-fg/[0.08] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-fg">Registrar gasto operativo</h2>
              <p className="text-xs text-fg-subtle">Costo fijo o variable del negocio</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-fg-subtle hover:bg-fg/[0.05] hover:text-fg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-500">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-fg-soft">Categoría *</label>
            <div className="relative">
              <Tag className="absolute left-3 top-2.5 h-4 w-4 text-fg-subtle" />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full rounded-xl border border-fg/[0.08] bg-fg/[0.03] py-2 pl-9 pr-3 text-sm text-fg outline-none focus:border-[var(--tenant-primary)]"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-fg-soft">Descripción *</label>
            <input
              type="text"
              required
              placeholder="Ej. Compra de pestañas y adhesivos, luz del local…"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded-xl border border-fg/[0.08] bg-fg/[0.03] px-3 py-2 text-sm text-fg outline-none focus:border-[var(--tenant-primary)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-fg-soft">
                Monto ({currencyCode}) *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-fg-subtle" />
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-xl border border-fg/[0.08] bg-fg/[0.03] py-2 pl-9 pr-3 text-sm text-fg outline-none focus:border-[var(--tenant-primary)]"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-fg-soft">
                Fecha del gasto
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-fg-subtle" />
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => {
                    setExpenseDate(e.target.value)
                    if (e.target.value) {
                      setExpenseMonth(`${e.target.value.slice(0, 7)}-01`)
                    }
                  }}
                  className="w-full rounded-xl border border-fg/[0.08] bg-fg/[0.03] py-2 pl-9 pr-3 text-sm text-fg outline-none focus:border-[var(--tenant-primary)]"
                />
              </div>
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 pt-1">
            <input
              type="checkbox"
              checked={isEstimated}
              onChange={(e) => setIsEstimated(e.target.checked)}
              className="h-4 w-4 rounded border-fg/[0.2] text-[var(--tenant-primary)] focus:ring-[var(--tenant-primary)]"
            />
            <span className="text-xs text-fg-soft">Es un gasto estimado / presupuestado</span>
          </label>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm text-fg-subtle hover:bg-fg/[0.05] hover:text-fg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-[var(--tenant-primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando…' : 'Guardar gasto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
