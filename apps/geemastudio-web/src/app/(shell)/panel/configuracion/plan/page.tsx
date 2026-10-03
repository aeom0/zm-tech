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
import { PageHeader } from '@/components/ui/PageHeader'

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

function UsageBar({ label, usage, limit }: { label: string; usage: number; limit: number | null }) {
  const status = getUsageStatus(usage, limit)
  const pct = limit === null || limit === 0 ? 0 : Math.min(100, Math.round((usage / limit) * 100))

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-fg-soft">{label}</span>
        <span className="tabular-nums text-fg-muted">
          {usage} / {limit === null ? 'ilimitado' : limit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-fg/[0.08]">
        <div
          className={`h-full rounded-full transition-all ${BAR_CLASS[status]}`}
          style={{ width: limit === null ? '0%' : `${pct}%` }}
        />
      </div>
    </div>
  )
}

function PlanCard({ plan, current, annual }: { plan: Plan; current: boolean; annual: boolean }) {
  const price = annual ? plan.annual_price : plan.monthly_price

  return (
    <div
      className={[
        'flex flex-col rounded-2xl border p-5',
        current
          ? 'border-[var(--tenant-primary)]/40 bg-[var(--tenant-primary)]/10'
          : 'border-fg/[0.08] bg-card',
      ].join(' ')}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-fg">{plan.name}</h3>
        {current && (
          <span className="bg-[var(--tenant-primary)]/20 rounded-full px-2.5 py-0.5 text-xs font-semibold text-tenant-text">
            Tu plan
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-fg-subtle">{plan.description}</p>
      <p className="mt-3 text-2xl font-bold tabular-nums text-fg">
        ${price}
        <span className="text-sm font-normal text-fg-subtle">/mes</span>
      </p>
      <ul className="mt-4 space-y-1.5 text-sm text-fg-soft">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function PanelPlanPage() {
  const { subscription: sub, staffStatus, wabaUsage, wabaStatus, isLoading, error } = usePlan()
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

      <PageHeader title="Mi plan" description="Tu plan, el uso frente a los límites y las opciones disponibles." />

      {error && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          {(error as Error).message}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-fg/[0.08] bg-card px-4 py-8 text-sm text-fg-subtle">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando plan…
        </div>
      )}

      {!isLoading && !error && !sub && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
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

          {wabaUsage && (
            <PlanLimitNotice
              status={wabaStatus}
              resource="mensajes de servicio de WhatsApp"
              usage={wabaUsage.service_messages}
              limit={sub.waba_conversations}
              planName={sub.plan_name}
            />
          )}

          <section className="space-y-4 rounded-2xl border border-fg/[0.08] bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-fg">Plan {sub.plan_name}</h2>
                <p className="mt-1 text-sm text-fg-muted">
                  Facturación {annual ? 'anual' : 'mensual'}
                  {trialEnd && sub.subscription_status === 'trial'
                    ? ` · Prueba hasta el ${trialEnd}`
                    : ''}
                </p>
              </div>
              <span className="rounded-full border border-fg/[0.1] bg-fg/[0.04] px-3 py-1 text-xs font-semibold text-fg-soft">
                {STATUS_LABEL[sub.subscription_status]}
              </span>
            </div>

            <div className="space-y-4">
              <UsageBar
                label="Profesionales activos"
                usage={sub.staff_count}
                limit={sub.max_staff}
              />
              {wabaUsage && (
                <div>
                  <UsageBar
                    label="Mensajes de servicio de WhatsApp (mes)"
                    usage={wabaUsage.service_messages}
                    limit={sub.waba_conversations}
                  />
                  <p className="mt-1.5 text-xs text-fg-subtle">
                    Solo cuentan respuestas dentro de la ventana de 24 h; los mensajes que llegan
                    por anuncios no cuentan.
                    {wabaUsage.data_through
                      ? ` Datos al ${new Date(`${wabaUsage.data_through}T12:00:00`).toLocaleDateString('es', { day: 'numeric', month: 'long' })}.`
                      : ''}
                  </p>
                </div>
              )}
            </div>

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-fg/[0.03] px-3 py-2.5">
                <dt className="text-xs text-fg-subtle">Sedes</dt>
                <dd className="text-fg-soft">{limitLabel(sub.max_branches, 'sedes')}</dd>
              </div>
              <div className="rounded-xl bg-fg/[0.03] px-3 py-2.5">
                <dt className="text-xs text-fg-subtle">Mensajes de servicio de WhatsApp por mes</dt>
                <dd className="text-fg-soft">
                  {sub.waba_conversations === null
                    ? 'Ilimitados'
                    : `${sub.waba_conversations.toLocaleString('es')} incluidos`}
                </dd>
              </div>
            </dl>
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-fg">Planes disponibles</h2>
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
                <PlanCard
                  key={p.code}
                  plan={p}
                  current={p.code === sub.plan_code}
                  annual={annual}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
