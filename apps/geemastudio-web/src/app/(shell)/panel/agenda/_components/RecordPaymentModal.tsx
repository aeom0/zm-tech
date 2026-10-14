'use client'

import { useId, useState } from 'react'
import { DollarSign } from 'lucide-react'
import {
  buildPaymentRows,
  completeAppointment,
  convertDraftAmount,
  createPayment,
  parseMoneyInput,
  paymentMethodsForCountry,
  paymentTypeFromPayment,
  updatePayment,
  type FinancesPayment,
  type FinancesPaymentType,
} from '@geemastudio/data'
import { formatearBs } from '@zmtech/tasas'

import { Button } from '@/components/ui/Button'
import { Field, FormError, inputClass } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useVesRate } from '@/hooks/useVesRate'
import { formatDashboardCurrency } from '@/lib/dashboardCurrency'
import { supabase } from '@/lib/supabase'

/** Montar solo mientras está abierto: el estado del formulario se inicializa al montar. */
interface RecordPaymentModalProps {
  appointmentId: string
  clientName: string
  /** Saldo pendiente de la cita (precio menos abonos/pagos ya registrados). */
  amountDue: number
  /** Precio total de la cita (referencia para el adelanto). */
  appointmentPrice: number
  currencyCode: string
  tenantId: string
  country: string
  /** Si viene, el modal edita ese pago en vez de crear uno. */
  payment?: FinancesPayment | null
  /** Marca la cita como completada después de registrar el cobro. */
  completeAfter?: boolean
  onClose: () => void
  onSuccess: () => void
}

const TYPE_OPTIONS: { id: FinancesPaymentType; label: string }[] = [
  { id: 'full', label: 'Pago' },
  { id: 'abono', label: 'Adelanto' },
  { id: 'producto', label: 'Producto' },
]

export function RecordPaymentModal({
  appointmentId,
  clientName,
  amountDue,
  appointmentPrice,
  currencyCode,
  tenantId,
  country,
  payment = null,
  completeAfter = false,
  onClose,
  onSuccess,
}: RecordPaymentModalProps) {
  const ids = useId()
  const isEdit = !!payment
  const methods = paymentMethodsForCountry(country)
  const { enabled: vesEnabled, rate: currentRate } = useVesRate()
  // Al editar se respeta la tasa con la que se registró el pago.
  const storedRate = payment?.exchange_rate != null ? Number(payment.exchange_rate) : null
  const rate = isEdit && storedRate && Number.isFinite(storedRate) ? storedRate : currentRate

  const [type, setType] = useState<FinancesPaymentType>(() =>
    payment ? paymentTypeFromPayment(payment) : 'full'
  )
  const [currency, setCurrency] = useState<'USD' | 'VES'>(() =>
    vesEnabled && payment?.paid_currency === 'VES' ? 'VES' : 'USD'
  )
  const [amount, setAmount] = useState(() => {
    if (payment) {
      return payment.paid_currency === 'VES' && payment.amount_ves != null
        ? Number(payment.amount_ves).toFixed(2)
        : Number(payment.amount).toFixed(2)
    }
    return amountDue > 0 ? amountDue.toFixed(2) : ''
  })
  const [productAmount, setProductAmount] = useState('')
  const [method, setMethod] = useState(payment?.method ?? methods[0]?.id ?? 'cash')
  const [notes, setNotes] = useState(payment?.notes ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const changeCurrency = (next: 'USD' | 'VES') => {
    if (next === currency) return
    setAmount((a) => convertDraftAmount(a, currency, next, rate))
    setProductAmount((a) => convertDraftAmount(a, currency, next, rate))
    setCurrency(next)
  }

  const currencyLabel = currency === 'VES' ? 'Bs.' : currencyCode
  const enteredNum = parseMoneyInput(amount)
  const equivalent =
    vesEnabled && rate && Number.isFinite(enteredNum) && enteredNum > 0
      ? currency === 'VES'
        ? `≈ ${formatDashboardCurrency(enteredNum / rate, currencyCode)}`
        : `≈ ${formatearBs(enteredNum * rate)}`
      : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setErrorMessage(null)

    const result = buildPaymentRows({
      tenantId,
      appointmentId,
      type,
      amount,
      currency: vesEnabled ? currency : 'USD',
      vesEnabled,
      rate,
      method,
      notes,
      serviceTotal: type === 'abono' && appointmentPrice > 0 ? String(appointmentPrice) : undefined,
      productAmount: !isEdit && type === 'full' ? productAmount : undefined,
      date: payment?.date ?? new Date().toISOString(),
    })
    if (!result.ok) {
      setErrorMessage(result.error)
      return
    }

    if (completeAfter) {
      const serviceUsd = result.rows
        .filter((r) => r.kind !== 'product')
        .reduce((sum, r) => sum + Number(r.amount), 0)
      if (serviceUsd + 0.005 < amountDue) {
        setErrorMessage('Para completar la cita registra el saldo completo.')
        return
      }
    }

    setIsSubmitting(true)
    try {
      if (payment) {
        const { tenant_id: _tenantId, ...patch } = result.rows[0]
        void _tenantId
        await updatePayment(supabase, payment.id, patch)
      } else {
        for (const row of result.rows) await createPayment(supabase, row)
      }
      if (completeAfter) await completeAppointment(supabase, appointmentId, 'completed')
      onSuccess()
      onClose()
    } catch (err) {
      setErrorMessage((err as Error).message || 'No se pudo guardar el pago')
    } finally {
      setIsSubmitting(false)
    }
  }

  const title = isEdit ? 'Editar pago' : completeAfter ? 'Cobrar y completar' : 'Registrar pago'
  const submitLabel = isEdit ? 'Guardar cambios' : completeAfter ? 'Cobrar y completar' : 'Registrar pago'
  const formId = `${ids}-form`

  return (
    <Modal
      title={title}
      icon={<DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
      description={
        <>
          Cita de <strong className="text-fg">{clientName}</strong>
          {!isEdit && amountDue > 0 && (
            <> · saldo {formatDashboardCurrency(amountDue, currencyCode)}</>
          )}
        </>
      }
      onClose={onClose}
      dismissible={!isSubmitting}
      footer={
        <>
          <Button onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={isSubmitting}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        <FormError message={errorMessage} />

        {!completeAfter && (
          <Segmented
            label="Tipo"
            value={type}
            options={TYPE_OPTIONS}
            onChange={(next) => {
              setType(next)
              if (next !== 'full') setProductAmount('')
            }}
          />
        )}

        {vesEnabled && (
          <Segmented
            label="Moneda"
            value={currency}
            options={[
              { id: 'USD', label: currencyCode },
              { id: 'VES', label: 'Bs.' },
            ]}
            onChange={changeCurrency}
            hint={
              rate
                ? `Tasa ${isEdit && storedRate ? 'del pago' : 'del día'}: ${formatearBs(rate)} por ${currencyCode}`
                : 'Sin tasa de cambio disponible'
            }
          />
        )}

        <Field label={`Monto (${currencyLabel})`} htmlFor={`${ids}-amount`} hint={equivalent}>
          <input
            id={`${ids}-amount`}
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            required
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={`${inputClass} text-base font-semibold`}
          />
        </Field>

        {type === 'full' && !isEdit && (
          <Field
            label={`Incluye productos (${currencyLabel}, opcional)`}
            htmlFor={`${ids}-product`}
            hint="Si parte del cobro es por productos, se registra aparte para las comisiones."
          >
            <input
              id={`${ids}-product`}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={productAmount}
              onChange={(e) => setProductAmount(e.target.value)}
              className={inputClass}
            />
          </Field>
        )}

        <Field label="Método de pago" htmlFor={`${ids}-method`}>
          <select
            id={`${ids}-method`}
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className={inputClass}
          >
            {methods.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Nota o referencia (opcional)" htmlFor={`${ids}-notes`}>
          <input
            id={`${ids}-notes`}
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej. Comprobante 123456"
            className={inputClass}
          />
        </Field>
      </form>
    </Modal>
  )
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string
  value: T
  options: { id: T; label: string }[]
  onChange: (next: T) => void
  hint?: string
}) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold text-fg-soft">{label}</div>
      <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-xl bg-fg/[0.04] p-1">
        {options.map((opt) => {
          const active = opt.id === value
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.id)}
              className={[
                'min-h-[36px] flex-1 rounded-lg px-3 text-sm font-medium transition',
                active ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg',
              ].join(' ')}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
      {hint && <p className="mt-1 text-xs text-fg-subtle">{hint}</p>}
    </div>
  )
}
