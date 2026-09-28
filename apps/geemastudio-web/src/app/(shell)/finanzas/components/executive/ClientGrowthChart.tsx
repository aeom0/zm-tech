'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { monthTick } from '@/hooks/finanzas/executiveDates'
import type { ClientGrowthRow } from '@/hooks/finanzas/executiveService'
import {
  ChartCard,
  ChartEmpty,
  ChartSkeleton,
  SwatchLegend,
} from './ChartCard'
import { useExecutiveFmt } from './ExecutiveFmtContext'

interface Props {
  data: ClientGrowthRow[]
  loading?: boolean
  clientTerm?: string
  appointmentTerm?: string
}

/** Plural simple: clienta → clientas, cita → citas. El singular se conserva en 1. */
function plural(termino: string, cantidad: number): string {
  const base = termino.trim().toLocaleLowerCase('es') || 'cliente'
  if (Math.abs(cantidad) === 1) return base
  if (base.endsWith('s')) return base
  return `${base}s`
}

function esFemenino(termino: string): boolean {
  return termino.trim().toLocaleLowerCase('es').endsWith('a')
}

function participioCompletado(termino: string): 'completadas' | 'completados' {
  return esFemenino(termino) ? 'completadas' : 'completados'
}

interface GrowthPoint {
  label: string
  nuevas: number
  recurrentes: number
  citas: number
}

function GrowthTooltip({
  row,
  clientTerm,
  appointmentTerm,
  colorNuevas,
  colorRecurrentes,
}: {
  row: GrowthPoint
  clientTerm: string
  appointmentTerm: string
  colorNuevas: string
  colorRecurrentes: string
}) {
  const personas = row.nuevas + row.recurrentes
  const deMas = row.citas - personas
  const fem = esFemenino(clientTerm)
  const gente = plural(clientTerm, personas)
  const gentePlural = plural(clientTerm, 2)
  const visitas = plural(appointmentTerm, row.citas)
  const hechas = participioCompletado(appointmentTerm)
  const distintas =
    personas === 1 ? (fem ? 'distinta' : 'distinto') : fem ? 'distintas' : 'distintos'
  const extra =
    deMas === 1
      ? `Hay 1 ${appointmentTerm} de más: ${fem ? 'una' : 'un'} ${clientTerm} vino otra vez en el mes.`
      : `Hay ${deMas} ${plural(appointmentTerm, deMas)} de más: ${fem ? 'algunas' : 'algunos'} ${gentePlural} vinieron más de una vez. ${row.nuevas} + ${row.recurrentes} no es ${row.citas}.`

  return (
    <div className="max-w-[240px] rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs leading-relaxed shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
      <p className="font-medium text-zinc-800 dark:text-zinc-100">{row.label}</p>
      <p className="mt-1.5 font-medium text-zinc-800 dark:text-zinc-100">
        {personas} {gente} {distintas}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
        <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: colorNuevas }} />
        {row.nuevas} nuevas, primera {appointmentTerm}
      </p>
      <p className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
        <span
          className="h-2 w-2 shrink-0 rounded-sm"
          style={{ backgroundColor: colorRecurrentes }}
        />
        {row.recurrentes} recurrentes, ya habían venido
      </p>
      <p className="mt-2 font-medium text-zinc-800 dark:text-zinc-100">
        {row.citas} {visitas} {hechas}
      </p>
      {deMas > 0 ? (
        <p className="mt-1 text-zinc-500 dark:text-zinc-400">
          {extra}
        </p>
      ) : (
        <p className="mt-1 text-zinc-500 dark:text-zinc-400">
          Cada {clientTerm} tuvo una sola {appointmentTerm}.
        </p>
      )}
    </div>
  )
}

export function ClientGrowthChart({
  data,
  loading,
  clientTerm = 'cliente',
  appointmentTerm = 'cita',
}: Props) {
  const { colors } = useExecutiveFmt()
  const gente = plural(clientTerm, 2)
  const visitas = plural(appointmentTerm, 2)
  const hechas = participioCompletado(appointmentTerm)
  const distintas = esFemenino(clientTerm) ? 'distintas' : 'distintos'
  const nuevasLabel = esFemenino(clientTerm) ? 'Nuevas' : 'Nuevos'
  const articuloVisitas = esFemenino(appointmentTerm) ? 'Las' : 'Los'
  const chartData: GrowthPoint[] = data.map((row) => ({
    label: monthTick(row.month_start),
    nuevas: row.nuevas,
    recurrentes: row.recurrentes,
    citas: row.citas,
  }))
  const hasMovement = chartData.some(
    (r) => r.nuevas > 0 || r.recurrentes > 0 || r.citas > 0
  )

  return (
    <ChartCard
      title={`Crecimiento de ${gente}`}
      subtitle={`La barra cuenta ${gente} ${distintas}. ${articuloVisitas} ${visitas} pueden ser más si alguien vino varias veces.`}
      legend={
        <SwatchLegend
          items={[
            { color: colors.primary, label: nuevasLabel },
            { color: colors.gold, label: 'Recurrentes' },
          ]}
        />
      }
    >
      {loading ? (
        <ChartSkeleton height={260} />
      ) : !hasMovement ? (
        <ChartEmpty message={`Sin ${visitas} ${hechas} en este rango.`} />
      ) : (
        <div className="h-[260px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-zinc-200 dark:stroke-zinc-700"
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'currentColor' }}
                className="text-zinc-500"
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: 'currentColor' }}
                width={32}
                className="text-zinc-500"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const row = payload[0]?.payload as GrowthPoint | undefined
                  if (!row) return null
                  return (
                    <GrowthTooltip
                      row={row}
                      clientTerm={clientTerm}
                      appointmentTerm={appointmentTerm}
                      colorNuevas={colors.primary}
                      colorRecurrentes={colors.gold}
                    />
                  )
                }}
              />
              <Bar
                dataKey="nuevas"
                name={nuevasLabel}
                stackId="clientes"
                fill={colors.primary}
                radius={[0, 0, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                dataKey="recurrentes"
                name="Recurrentes"
                stackId="clientes"
                fill={colors.gold}
                radius={[3, 3, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  )
}
