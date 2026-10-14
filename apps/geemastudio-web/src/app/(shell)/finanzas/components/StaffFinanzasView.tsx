'use client'

import { Banknote, Calendar, DollarSign, TrendingUp } from 'lucide-react'
import type { EmployeeDesglose, FinanzasPeriod, PaymentRow } from '@/hooks/finanzas/useFinanzasData'
import { paymentMethodLabel } from '@geemastudio/data'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { PaymentMethodIcon } from '@/components/finanzas/PaymentMethodIcon'
import { StateNote } from '@/components/ui/StateNote'

const PERIOD_LABELS: Record<FinanzasPeriod, string> = {
  day: 'Hoy',
  week: 'Esta semana',
  month: 'Este mes',
}

interface StaffFinanzasViewProps {
  employeeName: string | null
  employeeId?: string | null
  desgloseChicas: EmployeeDesglose[]
  payments: PaymentRow[]
  period: FinanzasPeriod
  setPeriod: (p: FinanzasPeriod) => void
  currencyCode: string
  fmtS: (n: number) => string
  isLoading: boolean
}

export function StaffFinanzasView({
  employeeName,
  employeeId,
  desgloseChicas,
  payments,
  period,
  setPeriod,
  currencyCode: _currencyCode,
  fmtS,
  isLoading,
}: StaffFinanzasViewProps) {
  const myDesglose =
    desgloseChicas.find((d) => d.id === employeeId) ||
    desgloseChicas.find((d) => d.name === employeeName) ||
    null

  const myPayments = myDesglose ? payments.filter((p) => p.employee_id === myDesglose.id) : []

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: myDesglose?.color || 'var(--tenant-primary)' }}
            />
            <h1 className="text-xl font-bold text-fg">
              {myDesglose?.name ? `Mis Pagos · ${myDesglose.name}` : 'Mis Pagos'}
            </h1>
          </div>
          <p className="mt-1 text-xs text-fg-subtle">
            Resumen de tus comisiones ganadas y servicios atendidos
          </p>
        </div>

        <SegmentedControl<FinanzasPeriod>
          ariaLabel="Período de finanzas"
          options={[
            { value: 'day', label: 'Hoy' },
            { value: 'week', label: 'Esta semana' },
            { value: 'month', label: 'Este mes' },
          ]}
          value={period}
          onChange={setPeriod}
        />
      </div>

      {isLoading ? (
        <StateNote kind="loading">Cargando tus pagos…</StateNote>
      ) : !myDesglose ? (
        <StateNote kind="empty">
          No se encontró el perfil de profesional vinculado a tu cuenta.
        </StateNote>
      ) : (
        <>
          {/* Tarjetas resumen */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-fg/[0.08] bg-card p-4">
              <div className="flex items-center justify-between text-xs text-fg-subtle">
                <span>Comisión ganada</span>
                <DollarSign className="h-4 w-4 text-[var(--tenant-primary)]" />
              </div>
              <div className="mt-2 text-xl font-bold text-fg">{fmtS(myDesglose.comision)}</div>
              {myDesglose.commissionLabel && (
                <div className="mt-1 text-[11px] text-fg-subtle">{myDesglose.commissionLabel}</div>
              )}
            </div>

            <div className="rounded-2xl border border-fg/[0.08] bg-card p-4">
              <div className="flex items-center justify-between text-xs text-fg-subtle">
                <span>Generado en citas</span>
                <TrendingUp className="h-4 w-4 text-fg-subtle" />
              </div>
              <div className="mt-2 text-xl font-bold text-fg">{fmtS(myDesglose.generado)}</div>
              <div className="mt-1 text-[11px] text-fg-subtle">Total facturado</div>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                <span>Ya liquidado</span>
                <Banknote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="mt-2 text-xl font-bold text-emerald-900 dark:text-emerald-100">
                {fmtS(myDesglose.comisionPagada)}
              </div>
              <div className="mt-1 text-[11px] text-emerald-700/70 dark:text-emerald-400/70">
                Pagado por el salón
              </div>
            </div>

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
                <span>Por liquidar</span>
                <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="mt-2 text-xl font-bold text-amber-900 dark:text-amber-100">
                {fmtS(myDesglose.comisionPendienteReal)}
              </div>
              <div className="mt-1 text-[11px] text-amber-700/70 dark:text-amber-400/70">
                Saldo pendiente
              </div>
            </div>
          </div>

          {/* Historial de pagos de mis citas */}
          <div className="rounded-2xl border border-fg/[0.08] bg-sunken p-5">
            <h3 className="mb-4 text-sm font-semibold text-fg">
              Citas y pagos del período ({myPayments.length})
            </h3>

            {myPayments.length === 0 ? (
              <p className="text-sm text-fg-subtle">
                No hay pagos registrados para tus citas en {PERIOD_LABELS[period].toLowerCase()}.
              </p>
            ) : (
              <div className="space-y-2">
                {myPayments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-fg/[0.06] bg-card p-3 text-sm"
                  >
                    <div>
                      <div className="font-semibold text-fg">
                        {p.client_name || 'Cliente sin nombre'}
                      </div>
                      <div className="mt-0.5 text-xs text-fg-muted">
                        {p.service_name || 'Servicio'} ·{' '}
                        {new Date(p.date).toLocaleDateString('es', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-fg">{fmtS(parseFloat(p.amount || '0'))}</div>
                      <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-fg-subtle">
                        <PaymentMethodIcon method={p.method} />
                        <span>{paymentMethodLabel(p.method)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
