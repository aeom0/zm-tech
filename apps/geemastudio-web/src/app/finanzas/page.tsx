'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  TrendingUp,
  Lock,
  ArrowLeft,
  LogOut,
  User,
  DollarSign,
  Clock,
  AlertCircle,
  Smartphone,
  CreditCard,
  Banknote,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useFinanzasData } from '@/hooks/finanzas/useFinanzasData'
import { LUNARIS } from '@/lib/theme'

const METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  yape: 'Yape',
  plin: 'Plin',
  transfer: 'Transferencia',
}

function MethodIcon({ method }: { method: string }) {
  if (method === 'card') return <CreditCard className="h-3.5 w-3.5" />
  if (method === 'yape' || method === 'plin' || method === 'transfer')
    return <Smartphone className="h-3.5 w-3.5" />
  return <Banknote className="h-3.5 w-3.5" />
}

function fmtS(n: number) {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString('es-PE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function FinanzasPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading, isAdmin, profile, logout } = useAuth()
  const finanzas = useFinanzasData()

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) router.replace('/finanzas/login')
  }, [isAuthenticated, authLoading, router])

  const handleLogout = async () => {
    await logout()
    router.replace('/finanzas/login')
    router.refresh()
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-sm text-zinc-500 dark:text-zinc-400">Cargando…</div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition-colors hover:text-[var(--primary)] dark:text-zinc-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Solo administración
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Este panel es solo para Vanessa y administradores. Tus ganancias las ves en la app móvil
            en Más → Finanzas.
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-8 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </main>
      </div>
    )
  }

  const {
    payments,
    totalMes,
    totalAbonos,
    pendienteMes,
    citasConPendiente,
    desgloseChicas,
    isLoading,
  } = finanzas

  const mesActual = new Date().toLocaleString('es-PE', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition-colors hover:text-[var(--primary)] dark:text-zinc-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Inicio
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              <TrendingUp className="h-4 w-4 text-[var(--primary)]" />
              Finanzas
            </span>
            <Link
              href="/dashboard"
              className="ml-1 border-l border-zinc-200 pl-3 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-800 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Dashboard
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {profile?.full_name && (
              <span className="hidden items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400 sm:flex">
                <User className="h-4 w-4" />
                {profile.full_name}
              </span>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              <LogOut className="h-4 w-4" />
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        {/* Título mes */}
        <div>
          <h1 className="text-2xl font-bold capitalize text-zinc-900 dark:text-zinc-100">
            {mesActual}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Panel de finanzas · ZM Lash &amp; Nails Beauty
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10">
                <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Total cobrado
              </span>
            </div>
            {isLoading ? (
              <div className="h-8 w-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
            ) : (
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {fmtS(totalMes)}
              </p>
            )}
            {!isLoading && totalAbonos > 0 && (
              <p className="mt-1 flex items-center gap-1 text-xs text-zinc-400">
                <Smartphone className="h-3 w-3" />
                Adelantos: {fmtS(totalAbonos)}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10">
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Pendiente mes
              </span>
            </div>
            {isLoading ? (
              <div className="h-8 w-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
            ) : (
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {fmtS(pendienteMes)}
              </p>
            )}
            {!isLoading && (
              <p className="mt-1 text-xs text-zinc-400">
                {citasConPendiente} citas con pago parcial
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 flex items-center gap-2">
              <div className="bg-[var(--primary)]/10 flex h-8 w-8 items-center justify-center rounded-xl">
                <AlertCircle className="h-4 w-4 text-[var(--primary)]" />
              </div>
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Transacciones
              </span>
            </div>
            {isLoading ? (
              <div className="h-8 w-16 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
            ) : (
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {payments.length}
              </p>
            )}
            <p className="mt-1 text-xs text-zinc-400">este mes</p>
          </div>
        </div>

        {/* Desglose por chica */}
        {!isLoading && desgloseChicas.length > 0 && (
          <section>
            <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Por chica — {mesActual}
            </h2>
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800">
                    <th className="px-4 py-3 text-left font-semibold text-zinc-500 dark:text-zinc-400">
                      Chica
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-zinc-500 dark:text-zinc-400">
                      Generado
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-zinc-500 dark:text-zinc-400">
                      Cobrado
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-zinc-500 dark:text-zinc-400">
                      Pendiente
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {desgloseChicas.map((e) => (
                    <tr
                      key={e.id}
                      className="border-b border-zinc-50 last:border-0 dark:border-zinc-800/50"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                            style={{ backgroundColor: e.color }}
                          />
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">
                            {e.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300">
                        {fmtS(e.generado)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {fmtS(e.pagado)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {e.pendiente > 0.01 ? (
                          <span className="font-semibold text-[var(--primary)]">
                            {fmtS(e.pendiente)}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Historial de pagos */}
        <section>
          <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Pagos — {mesActual}
          </h2>
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            {isLoading ? (
              <div className="space-y-3 p-6">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-12 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800"
                  />
                ))}
              </div>
            ) : payments.length === 0 ? (
              <div className="py-12 text-center">
                <DollarSign className="mx-auto mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-700" />
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Sin pagos este mes</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-800">
                      <th className="px-4 py-3 text-left font-semibold text-zinc-500 dark:text-zinc-400">
                        Fecha
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-zinc-500 dark:text-zinc-400">
                        Cliente / Servicio
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-zinc-500 dark:text-zinc-400">
                        Chica
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-zinc-500 dark:text-zinc-400">
                        Método
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-zinc-500 dark:text-zinc-400">
                        Monto
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => {
                      const monto = parseFloat(p.amount)
                      const total = p.service_total ? parseFloat(p.service_total) : null
                      return (
                        <tr
                          key={p.id}
                          className="border-b border-zinc-50 transition-colors last:border-0 hover:bg-zinc-50/50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/30"
                        >
                          <td className="whitespace-nowrap px-4 py-3 text-zinc-500 dark:text-zinc-400">
                            {fmtDate(p.date)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              {p.client_name && (
                                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                  {p.client_name}
                                </span>
                              )}
                              {p.service_name && (
                                <span className="text-xs text-zinc-400">{p.service_name}</span>
                              )}
                              {!p.client_name && !p.service_name && (
                                <span className="text-xs italic text-zinc-400">
                                  Sin cita vinculada
                                </span>
                              )}
                              {p.is_abono && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                  <Smartphone className="h-3 w-3" />
                                  Adelanto 20%
                                  {total && <span className="opacity-70"> / {fmtS(total)}</span>}
                                </span>
                              )}
                              {p.notes && (
                                <span className="text-xs italic text-zinc-400">{p.notes}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {p.employee_name ? (
                              <span className="inline-flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                                <span
                                  className="h-2 w-2 flex-shrink-0 rounded-full"
                                  style={{
                                    backgroundColor: p.employee_color ?? LUNARIS.primaryDark,
                                  }}
                                />
                                {p.employee_name}
                              </span>
                            ) : (
                              <span className="text-zinc-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                              <MethodIcon method={p.method} />
                              {METHOD_LABELS[p.method] ?? p.method}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-100">
                            {fmtS(monto)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <p className="pb-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
          zmlashnails.com/finanzas · Solo administración
        </p>
      </main>
    </div>
  )
}
