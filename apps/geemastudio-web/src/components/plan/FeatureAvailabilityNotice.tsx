import Link from 'next/link'
import { Info } from 'lucide-react'
import { getFeatureMinPlan, type PlanFeature } from '@geemastudio/shared-schema'

const PLAN_LABEL = { basic: 'Basic', pro: 'Pro', elite: 'Elite' } as const

type Props = {
  feature: PlanFeature
  /** Qué función es, en minúscula: "las finanzas", "el inventario". */
  label: string
  /** false = el plan actual ya la incluye y no se muestra nada. */
  included: boolean
  /** 'panel' = fondo oscuro fijo; 'adaptive' = páginas que siguen el tema claro/oscuro (/finanzas). */
  tone?: 'panel' | 'adaptive'
}

/** Aviso no bloqueante: la función sigue disponible, pero pertenece a un plan superior. */
export function FeatureAvailabilityNotice({ feature, label, included, tone = 'panel' }: Props) {
  if (included) return null

  return (
    <div
      role="status"
      className={[
        'flex flex-col gap-2 rounded-2xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between',
        tone === 'panel' ? 'text-sky-100' : 'text-sky-900 dark:text-sky-100',
      ].join(' ')}
    >
      <span className="flex items-start gap-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          {label.charAt(0).toUpperCase() + label.slice(1)} se incluye desde el plan{' '}
          {PLAN_LABEL[getFeatureMinPlan(feature)]}. Puedes seguir usándolo con normalidad durante la
          prueba.
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
