'use client'

import { useState } from 'react'
import { X, DollarSign } from 'lucide-react'
import {
  completeAppointment,
  createPayment,
  paymentMethodsForCountry,
  vesFieldsForQuickMethod,
} from '@geemastudio/data'
import { useVesRate } from '@/hooks/useVesRate'
import { supabase } from '@/lib/supabase'

/** Montar solo mientras está abierto: el estado del formulario se inicializa al montar. */
interface RecordPaymentModalProps {
  appointmentId: string
  clientName: string
  /** Saldo pendiente de la cita (precio menos abonos/pagos ya registrados). */
  amountDue: number
  currencyCode: string
  tenantId: string
  country: string
  /** Marca la cita como completada después de registrar el cobro. */
  completeAfter?: boolean
  onClose: () => void
  onSuccess: () => void
}

export function RecordPaymentModal({
  appointmentId,
  clientName,
  amountDue,
  currencyCode,
  tenantId,
  country,
  completeAfter = false,
  onClose,
  onSuccess,
}: RecordPaymentModalProps) {
  const methods = paymentMethodsForCountry(country)
  const { rate, formatBs } = useVesRate()
  const [amount, setAmount] = useState(amountDue > 0 ? amountDue.toFixed(2) : '')
  const [method, setMethod] = useState(methods[0]?.id ?? 'cash')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setIsSubmitting(true)
    setErrorMessage(null)

    const numAmount = parseFloat(amount.replace(',', '.'))
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      setErrorMessage('Ingresa un monto válido')
      setIsSubmitting(false)
      return
    }
    if (completeAfter && numAmount + 0.005 < amountDue) {
      setErrorMessage('Para completar la cita registra el saldo completo.')
      setIsSubmitting(false)
      return
    }

    try {
      await createPayment(supabase, {
        tenant_id: tenantId,
        appointment_id: appointmentId,
        amount: numAmount.toFixed(2),
        method,
        date: new Date().toISOString(),
        notes: notes.trim() || null,
        is_abono: false,
        ...vesFieldsForQuickMethod(method, numAmount, rate),
      })
      if (completeAfter) await completeAppointment(supabase, appointmentId, 'completed')
      onSuccess()
      onClose()
    } catch (err) {
      setErrorMessage((err as Error).message || 'No se pudo registrar el pago')
    } finally {
      setIsSubmitting(false)
    }
  }

  const bsPreview = method === 'pago_movil' ? formatBs(amount) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-scrim/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-fg/[0.08] bg-sunken p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-fg/[0.08] pb-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-lg font-bold text-fg">
              {completeAfter ? 'Cobrar y completar' : 'Registrar pago'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-fg-subtle hover:bg-fg/[0.05] hover:text-fg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-sm text-fg-muted">
            Cobro para la cita de <strong className="text-fg">{clientName}</strong>.
          </p>

          {errorMessage && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-fg-soft">
              Monto ({currencyCode}) *
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-fg/[0.08] bg-fg/[0.03] px-3 py-2 text-base font-semibold text-fg outline-none focus:border-[var(--tenant-primary)]"
            />
            {bsPreview && (
              <p className="mt-1 text-xs text-fg-subtle">Se registra en Bs.: {bsPreview}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-fg-soft">
              Método de pago *
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full rounded-xl border border-fg/[0.08] bg-fg/[0.03] px-3 py-2 text-sm text-fg outline-none focus:border-[var(--tenant-primary)]"
            >
              {methods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-fg-soft">
              Nota / Referencia (opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Comprobante 123456"
              className="w-full rounded-xl border border-fg/[0.08] bg-fg/[0.03] px-3 py-2 text-sm text-fg outline-none focus:border-[var(--tenant-primary)]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-fg/[0.08] px-4 py-2 text-sm font-medium text-fg-soft hover:bg-fg/[0.04]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmitting
                ? 'Registrando…'
                : completeAfter
                  ? 'Cobrar y completar'
                  : 'Confirmar pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
