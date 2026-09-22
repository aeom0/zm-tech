'use client'

import {
  DollarSign,
  Megaphone,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useExecutiveFmt } from './ExecutiveFmtContext'
import { MiniSparkline } from './MiniSparkline'

interface Props {
  ingresos: number
  gastos: number
  ads: number
  utilidad: number
  margenPct: number | null
  loading?: boolean
  sparklines?: {
    ingresos: number[]
    gastos: number[]
    ads: number[]
    utilidad: number[]
  }
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  loading,
  hero,
  sparkline,
}: {
  label: string
  value: string
  hint?: string
  icon: typeof DollarSign
  tone?: 'default' | 'success' | 'danger'
  loading?: boolean
  hero?: boolean
  sparkline?: number[]
}) {
  const valueClass =
    tone === 'success'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'danger'
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-zinc-900 dark:text-zinc-100'
  const iconWrap =
    tone === 'success'
      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
      : tone === 'danger'
        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
        : 'bg-[var(--primary)]/10 text-[var(--primary)]'

  return (
    <div
      className={`min-w-0 rounded-2xl border p-4 shadow-sm sm:p-5 ${
        hero
          ? 'col-span-2 border-[var(--primary)]/20 bg-gradient-to-br from-[var(--primary)]/10 to-[var(--accent,#FFD700)]/10 motion-reduce:transition-none lg:col-span-1'
          : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${iconWrap}`}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </div>
          <span className="truncate text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {label}
          </span>
        </div>
        {!loading && sparkline && sparkline.length >= 2 ? (
          <MiniSparkline values={sparkline} tone={tone} />
        ) : null}
      </div>
      {loading ? (
        <div className="h-8 w-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      ) : (
        <p
          className={`font-bold tabular-nums ${valueClass} ${hero ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'}`}
        >
          {value}
        </p>
      )}
      {hint && !loading ? <p className="mt-1 text-xs text-zinc-400">{hint}</p> : null}
    </div>
  )
}

export function KpiStrip({
  ingresos,
  gastos,
  ads,
  utilidad,
  margenPct,
  loading,
  sparklines,
}: Props) {
  const { fmt } = useExecutiveFmt()
  const utilidadTone = utilidad > 0 ? 'success' : utilidad < 0 ? 'danger' : 'default'
  const UtilidadIcon = utilidad >= 0 ? TrendingUp : TrendingDown

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <KpiCard
        label="Ingresos"
        value={fmt(ingresos)}
        icon={DollarSign}
        loading={loading}
        sparkline={sparklines?.ingresos}
      />
      <KpiCard
        label="Gastos"
        value={fmt(gastos)}
        icon={Wallet}
        loading={loading}
        sparkline={sparklines?.gastos}
      />
      <KpiCard
        label="Ads Meta"
        value={fmt(ads)}
        icon={Megaphone}
        loading={loading}
        sparkline={sparklines?.ads}
      />
      <KpiCard
        label="Utilidad neta"
        value={fmt(utilidad)}
        hint={margenPct == null ? 'Sin ingresos este mes' : `Margen ${margenPct}%`}
        icon={UtilidadIcon}
        tone={utilidadTone}
        loading={loading}
        hero
        sparkline={sparklines?.utilidad}
      />
    </div>
  )
}
