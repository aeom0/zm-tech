'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { EmployeeDesglose } from '@/hooks/finanzas/useFinanzasData'

interface Props {
  open: boolean
  row: EmployeeDesglose | null
  periodStart: string
  periodEnd: string
  isPending: boolean
  error: Error | null
  onClose: () => void
  onSubmit: (data: { amount: number; method: string | null; notes: string | null }) => void
}

export function RegisterPayoutModal({
  open,
  row,
  periodStart,
  periodEnd,
  isPending,
  error,
  onClose,
  onSubmit,
}: Props) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open || !row) return
    setAmount(row.comisionPendienteReal > 0 ? row.comisionPendienteReal.toFixed(2) : '')
    setMethod('')
    setNotes('')
  }, [open, row])

  if (!open || !row) return null

  const parsedAmount = Number.parseFloat(amount.replace(',', '.'))
  const canSave = Number.isFinite(parsedAmount) && parsedAmount > 0

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-scrim/50 sm:items-center sm:px-4">
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-zinc-200 bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-xl dark:border-zinc-800 dark:bg-zinc-900 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Marcar pago — {row.name}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          Período {periodStart} a {periodEnd}. Si registras un pago de un rango más amplio (ej. el
          mes completo), aparecerá reflejado también al filtrar por rangos más chicos dentro de ese
          mes.
        </p>

        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Monto pagado (S/)
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="mb-3 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-base text-zinc-900 outline-none focus:border-[var(--primary)] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 md:text-sm"
        />

        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Método (opcional)
        </label>
        <input
          type="text"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          placeholder="Efectivo, transferencia..."
          className="mb-3 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-base text-zinc-900 outline-none focus:border-[var(--primary)] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 md:text-sm"
        />

        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Notas (opcional)
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas"
          className="mb-5 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-base text-zinc-900 outline-none focus:border-[var(--primary)] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 md:text-sm"
        />

        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-400">
            {error.message || 'No se pudo registrar el pago. Intenta de nuevo.'}
          </p>
        )}

        <button
          type="button"
          disabled={!canSave || isPending}
          onClick={() =>
            onSubmit({
              amount: parsedAmount,
              method: method.trim() || null,
              notes: notes.trim() || null,
            })
          }
          className="w-full rounded-full bg-[var(--tenant-primary)] py-2.5 text-sm font-bold text-[var(--tenant-on-primary)] transition-opacity disabled:opacity-50"
        >
          {isPending ? 'Guardando…' : 'Registrar pago'}
        </button>
      </div>
    </div>
  )
}
