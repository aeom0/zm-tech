'use client'

import Image from 'next/image'
import { CheckCircle2, Download, Smartphone } from 'lucide-react'

import { InstallSteps } from '@/components/pwa/InstallSteps'
import { usePwaInstall } from '@/hooks/pwa/usePwaInstall'
import { GradientCta, Rise } from './OnboardingUi'

/** El APK aún no tiene descarga pública (Plan 17 F5): se envía por WhatsApp. */
const APK_WHATSAPP = '584144940417'

export function OnboardingDone({
  businessName,
  stats,
  onFinish,
}: {
  businessName: string
  stats: ReadonlyArray<{ value: string; label: string }>
  onFinish: () => void
}) {
  const { canPrompt, platform, standalone, stage, install } = usePwaInstall()
  const apkHref = `https://wa.me/${APK_WHATSAPP}?text=${encodeURIComponent(
    `Hola, quiero la app de GeemaStudio para Android (APK) para ${businessName}.`
  )}`

  return (
    <div className="space-y-6 text-center">
      <Rise>
        <div className="relative mx-auto h-36 w-36">
          <span
            aria-hidden
            className="absolute inset-0 animate-pulse rounded-full blur-2xl"
            style={{
              background:
                'radial-gradient(circle at 35% 45%, rgba(64,224,208,0.65), transparent 60%), radial-gradient(circle at 65% 55%, rgba(57,73,171,0.8), transparent 60%)',
            }}
          />
          <Image src="/logo-diamondSparkle.svg" alt="" width={144} height={144} className="relative h-36 w-36 p-6" priority />
        </div>
      </Rise>

      <Rise order={1} className="space-y-1">
        <h1 className="text-3xl font-bold text-white">¡Todo listo!</h1>
        <p className="bg-geema-gradient bg-clip-text text-lg font-semibold text-transparent">{businessName}</p>
        <p className="text-sm text-zinc-400">Tu negocio está configurado y listo para recibir clientes.</p>
      </Rise>

      <Rise order={2} className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/[0.08] bg-zinc-900/80 px-2 py-3">
            <p className="text-xl font-bold text-white">{s.value}</p>
            <p className="text-[11px] text-zinc-500">{s.label}</p>
          </div>
        ))}
      </Rise>

      {standalone ? null : (
        <Rise order={3}>
          <section className="space-y-3 rounded-2xl border border-white/[0.08] bg-zinc-900/80 p-5 text-left">
            <div className="flex items-start gap-3">
              <span className="bg-geema-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <Download className="h-5 w-5 text-white" aria-hidden />
              </span>
              <div>
                <p className="font-semibold text-white">Instala tu app</p>
                <p className="text-sm text-zinc-400">
                  Con el ícono y el nombre de {businessName} en tu pantalla de inicio. Sin tiendas ni descargas.
                </p>
              </div>
            </div>

            {stage === 'installing' ? (
              <p className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                Instalando. En unos segundos la verás en tu pantalla de inicio.
              </p>
            ) : (
              <>
                {canPrompt ? (
                  <button
                    type="button"
                    onClick={() => void install()}
                    className="w-full rounded-xl border border-[#40E0D0]/50 bg-[#40E0D0]/10 py-3 text-sm font-semibold text-[#40E0D0] transition hover:bg-[#40E0D0]/20"
                  >
                    Instalar app (recomendado)
                  </button>
                ) : null}
                <InstallSteps platform={platform} stage={stage} className="text-xs text-zinc-500" />
              </>
            )}

            {platform === 'ios' ? null : (
              <a
                href={apkHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 border-t border-white/[0.06] pt-3 text-xs text-zinc-400 hover:text-white"
              >
                <Smartphone className="h-4 w-4 shrink-0" aria-hidden />
                ¿Prefieres la app para Android (APK)? Pídela por WhatsApp.
              </a>
            )}
          </section>
        </Rise>
      )}

      <Rise order={4}>
        <GradientCta onClick={onFinish} className="w-full">
          Ir a mi panel
        </GradientCta>
      </Rise>
    </div>
  )
}
