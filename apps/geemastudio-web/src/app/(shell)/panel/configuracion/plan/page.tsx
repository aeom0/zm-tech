'use client'

import { Check, Loader2, MessageCircle } from 'lucide-react'
import {
  getUsageStatus,
  type Plan,
  type SubscriptionStatus,
  type UsageStatus,
} from '@geemastudio/shared-schema'

import { PlanLimitNotice } from '@/components/plan/PlanLimitNotice'
import { usePlan, usePublicPlans } from '@/hooks/plan/usePlan'
import { ConfiguracionNav } from '../_components/ConfiguracionNav'

const CONTACT_URL = 'https://wa.me/51932535512'

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  trial: 'Prueba',
  active: 'Activo',
  past_due: 'Pago pendiente',
  canceled: 'Cancelado',
}

const BAR_CLASS: Record<UsageStatus, string> = {
  ok: 'bg-emerald-400',
  near: 'bg-sky-400',
  over: 'bg-amber-400',
}

function limitLabel(limit: number | null, unit: string): string {
  return limit === null ? `${unit} ilimitados` : `${limit} ${unit}`
}

function UsageBar({
  label,
  usage,
  limit,
}: {
  label: string
  usage: number
  limit: number | null
}) {
  const status = getUsageStatus(usage, limit)
  const pct = limit === null || limit === 0 ? 0 : Math.min(100, Math.round((usage / limit) * 100))

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-zinc-300">{label}</span>
        <span className="tabular-nums text-zinc-400">
          {usage} / {limit === null ? 'ilimitado' : limit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className={`h-full rounded-full transition-all ${BAR_CLASS[status]}`}
          style={{ width: limit === null ? '0%' : `${pct}%` }}
        />
      </div>
    </div>
  )
}

function PlanCard({
  plan,
  current,
  annual,
}: {
  plan: Plan
  current: boolean
  annual: boolean
}) {
  const price = annual ? plan.annual_price : plan.monthly_price

  return (
    <div
      className={[
        'flex flex-col rounded-2xl border p-5',
        current
          ? 'border-[var(--tenant-primary)]/40 bg-[var(--tenant-primary)]/10'
          : 'border-white/[0.08] bg-white/[0.02]',
      ].join(' ')}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">{plan.name}</h3>
        {current && (
          <span className="rounded-full bg-[var(--tenant-primary)]/20 px-2.5 py-0.5 text-xs font-semibold text-[var(--tenant-primary)]">
            Tu plan
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-zinc-500">{plan.description}</p>
      <p className="mt-3 text-2xl font-bold tabular-nums text-white">
        ${price}
        <span className="text-sm font-normal text-zinc-500">/mes</span>
      </p>
      <ul className="mt-4 space-y-1.5 text-sm text-zinc-300">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function PanelPlanPage() {
  const { subscription: sub, staffStatus, isLoading, error } = usePlan()
  const plansQuery = usePublicPlans()

  const annual = sub?.billing_cycle === 'annual'
  const trialEnd = sub?.trial_ends_at
    ? new Date(sub.trial_ends_at).toLocaleDateString('es', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <div className="space-y-6">
      <ConfiguracionNav />

      <div>
        <div className="text-xs text-zinc-500">Panel</div>
        <h1 className="text-2xl font-bold text-white">Mi plan</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Tu plan, el uso frente a los límites y las opciones disponibles.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {(error as Error).message}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-8 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando plan…
        </div>
      )}

      {!isLoading && !error && !sub && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          No encontramos una suscripción para este negocio. Escríbenos y la activamos.
        </div>
      )}

      {sub && (
        <>
          <PlanLimitNotice
            status={staffStatus}
            resource="profesionales"
            usage={sub.staff_count}
            limit={sub.max_staff}
            planName={sub.plan_name}
          />

          <section className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-white">Plan {sub.plan_name}</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Facturación {annual ? 'anual' : 'mensual'}
                  {trialEnd && sub.subscription_status === 'trial'
                    ? ` · Prueba hasta el ${trialEnd}`
                    : ''}
                </p>
              </div>
              <span className="rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1 text-xs font-semibold text-zinc-200">
                {STATUS_LABEL[sub.subscription_status]}
              </span>
            </div>

            <div className="space-y-4">
              <UsageBar label="Profesionales activos" usage={sub.staff_count} limit={sub.max_staff} />
            </div>

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-white/[0.03] px-3 py-2.5">
                <dt className="text-xs text-zinc-500">Sedes</dt>
                <dd className="text-zinc-200">{limitLabel(sub.max_branches, 'sedes')}</dd>
              </div>
              <div className="rounded-xl bg-white/[0.03] px-3 py-2.5">
                <dt className="text-xs text-zinc-500">Conversaciones de WhatsApp por mes</dt>
                <dd className="text-zinc-200">
                  {sub.waba_conversations === null
                    ? 'Ilimitadas'
                    : `${sub.waba_conversations} incluidas`}
                </dd>
              </div>
            </dl>
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-white">Planes disponibles</h2>
              <a
                href={CONTACT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--tenant-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--tenant-on-primary)] hover:bg-[var(--tenant-primary-hover)] hover:text-[var(--tenant-on-primary-hover)]"
              >
                <MessageCircle className="h-4 w-4" />
                Contactar para cambiar de plan
              </a>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {(plansQuery.data ?? []).map((p) => (
                <PlanCard key={p.code} plan={p} current={p.code === sub.plan_code} annual={annual} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
