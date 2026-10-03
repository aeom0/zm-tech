'use client'

import Link from 'next/link'
import type { ComponentType } from 'react'
import {
  AlertCircle,
  BarChart2,
  CheckCircle2,
  Images,
  Megaphone,
  MessageSquare,
  MessageSquareText,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'

import { useWabaStatus } from '@/hooks/waba/useWabaStatus'
import { StateNote } from '@/components/ui/StateNote'
import { PageHeader } from '@/components/ui/PageHeader'

type QuickLink = {
  href: string
  label: string
  description: string
  icon: ComponentType<{ className?: string }>
}

const QUICK_LINKS: QuickLink[] = [
  {
    href: '/panel/waba/mensajes',
    label: 'Mensajes',
    description: 'Conversaciones de WhatsApp con tus clientes',
    icon: MessageSquareText,
  },
  {
    href: '/panel/waba/campanas',
    label: 'Campañas',
    description: 'Envíos masivos por WhatsApp con segmentación',
    icon: Megaphone,
  },
  {
    href: '/panel/waba/portafolio',
    label: 'Portafolio',
    description: 'Catálogo de servicios y fotos compartidas por el bot',
    icon: Images,
  },
  {
    href: '/panel/waba/haiku',
    label: 'Asistente IA',
    description: 'Personalidad y reglas del asistente de WhatsApp',
    icon: Sparkles,
  },
  {
    href: '/panel/waba/simulador',
    label: 'Simulador',
    description: 'Probar respuestas del bot sin enviar mensajes reales',
    icon: MessageSquare,
  },
  {
    href: '/panel/waba/historial',
    label: 'Historial',
    description: 'Analytics de actividad, volumen y top flujos',
    icon: BarChart2,
  },
  {
    href: '/panel/waba/reglas',
    label: 'Reglas',
    description: 'Horario, abono y chicas por categoría',
    icon: SlidersHorizontal,
  },
]

function maskId(id: string | null): string {
  if (!id) return '—'
  if (id.length <= 8) return '••••'
  return `${id.slice(0, 4)}…${id.slice(-4)}`
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        ok
          ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
          : 'border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-200',
      ].join(' ')}
    >
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
      {label}
    </span>
  )
}

export default function PanelWabaPage() {
  const { data, isLoading, isError, error } = useWabaStatus()

  return (
    <div className="space-y-6">
      <PageHeader title="WhatsApp" description="Estado de la integración WABA, historial de chats y personalidad del asistente." />

      {isError && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          {error instanceof Error ? error.message : 'No se pudo cargar el estado de WhatsApp'}
        </div>
      )}

      {isLoading && (
        <StateNote kind="loading">Cargando estado…</StateNote>
      )}

      {!isLoading && data && (
        <>
          <div className="rounded-2xl border border-fg/[0.08] bg-fg/[0.03] p-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill
                ok={data.featuresWhatsapp}
                label={data.featuresWhatsapp ? 'WhatsApp activo' : 'WhatsApp desactivado'}
              />
              <StatusPill
                ok={data.featuresWaba}
                label={data.featuresWaba ? 'Asistente activo' : 'Asistente desactivado'}
              />
              <StatusPill
                ok={Boolean(data.phoneNumberId)}
                label={data.phoneNumberId ? 'Número conectado' : 'Sin número conectado'}
              />
              <StatusPill
                ok={data.hasAccessToken}
                label={data.hasAccessToken ? 'Conexión vigente' : 'Sin conexión'}
              />
            </div>

            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-fg-subtle">Negocio</dt>
                <dd className="mt-1 text-sm text-fg">{data.businessName || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-fg-subtle">Número de WhatsApp conectado</dt>
                <dd className="mt-1 font-mono text-sm text-fg">{maskId(data.phoneNumberId)}</dd>
              </div>
            </dl>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {QUICK_LINKS.map(({ href, label, description, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-start gap-3 rounded-2xl border border-fg/[0.08] bg-fg/[0.03] p-4 transition-colors hover:bg-fg/[0.06]"
              >
                <span className="border-[var(--tenant-primary)]/25 bg-[var(--tenant-primary)]/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-tenant-text">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-fg">{label}</span>
                  <span className="mt-0.5 block text-xs text-fg-muted">{description}</span>
                </span>
              </Link>
            ))}
          </div>
        </>
      )}

      {!isLoading && !isError && !data && (
        <StateNote kind="empty">Aún no hay configuración del negocio para esta sesión.</StateNote>
      )}
    </div>
  )
}
