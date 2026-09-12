'use client'

import Link from 'next/link'
import { AlertCircle, CheckCircle2, MessageSquareText, Sparkles } from 'lucide-react'

import { useWabaStatus } from '@/hooks/waba/useWabaStatus'

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
          ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
          : 'border-amber-500/25 bg-amber-500/10 text-amber-200',
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
      <div>
        <div className="text-xs text-zinc-500">Panel</div>
        <h1 className="text-2xl font-bold text-white">WhatsApp</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Estado de la integración WABA, historial de chats y personalidad del asistente.
        </p>
      </div>

      {isError && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error instanceof Error ? error.message : 'No se pudo cargar el estado WABA'}
        </div>
      )}

      {isLoading && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-8 text-center text-sm text-zinc-500">
          Cargando estado…
        </div>
      )}

      {!isLoading && data && (
        <>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill
                ok={data.featuresWhatsapp}
                label={data.featuresWhatsapp ? 'WhatsApp UI activo' : 'WhatsApp UI off'}
              />
              <StatusPill
                ok={data.featuresWaba}
                label={data.featuresWaba ? 'Bot WABA activo' : 'Bot WABA off'}
              />
              <StatusPill
                ok={Boolean(data.phoneNumberId)}
                label={data.phoneNumberId ? 'Phone number ID' : 'Sin phone ID'}
              />
              <StatusPill
                ok={data.hasAccessToken}
                label={data.hasAccessToken ? 'Token configurado' : 'Sin token'}
              />
            </div>

            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-zinc-500">Negocio</dt>
                <dd className="mt-1 text-sm text-zinc-100">{data.businessName || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Tenant slug</dt>
                <dd className="mt-1 font-mono text-sm text-zinc-100">{data.tenantSlug || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Phone number ID</dt>
                <dd className="mt-1 font-mono text-sm text-zinc-100">
                  {maskId(data.phoneNumberId)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Webhook</dt>
                <dd className="mt-1 text-sm text-zinc-400">
                  Configurado en Meta → Edge Function del proyecto Supabase (ops, no desde este
                  panel).
                </dd>
              </div>
            </dl>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/panel/waba/mensajes"
              className="flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.06]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#40E0D0]/25 bg-[#40E0D0]/10 text-[#40E0D0]">
                <MessageSquareText className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-white">Mensajes</span>
                <span className="mt-0.5 block text-xs text-zinc-400">
                  Conversaciones e hilos desde wa_messages
                </span>
              </span>
            </Link>
            <Link
              href="/panel/waba/haiku"
              className="flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.06]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#40E0D0]/25 bg-[#40E0D0]/10 text-[#40E0D0]">
                <Sparkles className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-white">Asistente IA</span>
                <span className="mt-0.5 block text-xs text-zinc-400">
                  System prompt Haiku (waba_config)
                </span>
              </span>
            </Link>
          </div>
        </>
      )}

      {!isLoading && !isError && !data && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-8 text-center text-sm text-zinc-500">
          No hay tenant_settings para esta sesión.
        </div>
      )}
    </div>
  )
}
