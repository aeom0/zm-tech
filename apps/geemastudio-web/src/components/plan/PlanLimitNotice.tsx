import Link from 'next/link'
import { AlertTriangle, Info } from 'lucide-react'
import type { UsageStatus } from '@geemastudio/shared-schema'

type Props = {
  status: UsageStatus
  /** Qué se limita, en plural y minúscula: "profesionales", "empleados". */
  resource: string
  usage: number
  limit: number | null
  planName: string
}

/** Aviso no bloqueante al acercarse (80%) o superar el límite del plan. */
export function PlanLimitNotice({ status, resource, usage, limit, planName }: Props) {
  if (status === 'ok' || limit === null) return null

  const over = status === 'over'
  const Icon = over ? AlertTriangle : Info

  return (
    <div
      role="status"
      className={[
        'flex flex-col gap-2 rounded-2xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between',
        over
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
          : 'border-sky-500/25 bg-sky-500/10 text-sky-100',
      ].join(' ')}
    >
      <span className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          {over
            ? `Superaste el límite de ${resource} del plan ${planName} (${usage} de ${limit}).`
            : `Estás usando ${usage} de ${limit} ${resource} del plan ${planName}.`}{' '}
          Puedes seguir trabajando con normalidad.
        </span>
      </span>
      <Link
        href="/panel/configuracion/plan"
        className="shrink-0 font-semibold underline underline-offset-2"
      >
        Ver mi plan
      </Link>
    </div>
  )
}
