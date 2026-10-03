'use client'

import { useEffect, useState } from 'react'
import { Clock, Loader2 } from 'lucide-react'
import { ConfiguracionNav } from '../configuracion/_components/ConfiguracionNav'

import { supabase } from '@/lib/supabase'
import type { TenantConfig, TimeFormatPreference } from '@zmtech/tenant-config'
import {
  CLAVES_DIA_LABORAL,
  ETIQUETA_DIA_LABORAL,
  ZONAS_HORARIAS_SUGERIDAS,
  normalizarHorarioSemanal,
  validarHorarioCompleto,
} from '@zmtech/tenant-config'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StateNote } from '@/components/ui/StateNote'

export default function PanelHorariosPage() {
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [draftTimezone, setDraftTimezone] = useState('America/Caracas')
  const [draftHours, setDraftHours] = useState<TenantConfig['businessHours']>(() =>
    normalizarHorarioSemanal(undefined)
  )
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [zonasExpandidas, setZonasExpandidas] = useState(false)
  const [draftTimeFormat, setDraftTimeFormat] = useState<TimeFormatPreference>('24')

  useEffect(() => {
    let cancelled = false

    async function cargar() {
      // Primer await antes de setState: evita set-state-in-effect síncrono
      if (!supabase) {
        await Promise.resolve()
        if (cancelled) return
        setErrorCarga('No se pudo conectar. Intenta de nuevo.')
        setCargando(false)
        return
      }

      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getUser()
        if (cancelled) return

        if (sessionError || !sessionData.user) {
          setErrorCarga('No hay sesión activa.')
          setCargando(false)
          return
        }

        const uid = sessionData.user.id
        setUserId(uid)

        const { data, error } = await supabase
          .from('tenant_settings')
          .select('timezone, business_hours, time_format')
          .eq('id', uid)
          .maybeSingle()

        if (cancelled) return

        if (error) {
          throw new Error(error.message)
        }

        if (data) {
          const tz =
            typeof data.timezone === 'string' && data.timezone ? data.timezone : 'America/Caracas'
          setDraftTimezone(tz)
          setDraftHours(
            normalizarHorarioSemanal(data.business_hours as TenantConfig['businessHours'] | null)
          )
          const tf = (data as { time_format?: string | null }).time_format
          setDraftTimeFormat(tf === '12' ? '12' : '24')
        }
      } catch (e) {
        if (!cancelled) {
          setErrorCarga(e instanceof Error ? e.message : 'Error al cargar.')
        }
      } finally {
        if (!cancelled) setCargando(false)
      }
    }

    void cargar()
    return () => {
      cancelled = true
    }
  }, [])

  const setDiaAbierto = (dia: (typeof CLAVES_DIA_LABORAL)[number], abierto: boolean) => {
    setDraftHours((prev) => {
      const next = { ...prev }
      if (!abierto) {
        next[dia] = null
      } else {
        next[dia] = prev[dia] ?? { open: '10:00', close: '19:00' }
      }
      return next
    })
  }

  const setHorasDia = (
    dia: (typeof CLAVES_DIA_LABORAL)[number],
    campo: 'open' | 'close',
    texto: string
  ) => {
    setDraftHours((prev) => {
      const slot = prev[dia]
      const base = slot ?? { open: '10:00', close: '19:00' }
      return {
        ...prev,
        [dia]: { ...base, [campo]: texto },
      }
    })
  }

  const guardar = async () => {
    if (!supabase || !userId) return
    const err = validarHorarioCompleto(draftHours)
    if (err) {
      setMensaje(err)
      return
    }
    setMensaje(null)
    setGuardando(true)
    try {
      const { error } = await supabase
        .from('tenant_settings')
        .update({
          timezone: draftTimezone,
          business_hours: draftHours,
          time_format: draftTimeFormat,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) {
        throw new Error(error.message)
      }
      setMensaje('Cambios guardados.')
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : 'Error al guardar.')
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return (
      <div className="max-w-2xl space-y-6">
        <ConfiguracionNav />
        <StateNote kind="loading">Cargando horario…</StateNote>
      </div>
    )
  }

  if (errorCarga) {
    return (
      <div className="max-w-2xl space-y-6">
        <ConfiguracionNav />
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          {errorCarga}
        </div>
      </div>
    )
  }

  const zonasVisibles = zonasExpandidas
    ? ZONAS_HORARIAS_SUGERIDAS
    : ZONAS_HORARIAS_SUGERIDAS.slice(0, 4)

  return (
    <div className="max-w-2xl space-y-8">
      <ConfiguracionNav />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-lg font-semibold text-fg">
            <Clock className="h-5 w-5" style={{ color: 'var(--tenant-primary)' }} />
            Horario de trabajo
          </div>
          <p className="mt-2 max-w-prose text-sm text-fg-muted">
            Define la zona horaria del negocio y la franja de apertura por día. Los cambios aplican
            en el panel y también se reflejan en la app del celular.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void guardar()}
          disabled={guardando}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--tenant-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--tenant-on-primary)] transition-colors hover:bg-[var(--tenant-primary-hover)] disabled:opacity-60"
        >
          {guardando ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Guardando…
            </>
          ) : (
            'Guardar cambios'
          )}
        </button>
      </div>

      {mensaje ? (
        <div
          className={[
            'rounded-xl border px-4 py-3 text-sm',
            mensaje.toLowerCase().includes('guardad')
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100',
          ].join(' ')}
        >
          {mensaje}
        </div>
      ) : null}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-fg-soft">Formato de hora en la app</h2>
        <p className="mb-3 max-w-prose text-xs text-fg-subtle">
          Cómo se muestran las horas en la agenda móvil. Los horarios de apertura siguen en 24 h al
          editarlos.
        </p>
        <SegmentedControl
          className="mb-8 sm:w-auto"
          ariaLabel="Formato de hora"
          value={draftTimeFormat}
          onChange={setDraftTimeFormat}
          options={[
            { value: '24', label: '24 horas' },
            { value: '12', label: '12 horas (AM / PM)' },
          ]}
        />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-fg-soft">Zona horaria</h2>
        <p className="mb-3 text-xs text-fg-subtle">Seleccionada: {draftTimezone}</p>
        <div className="divide-y divide-fg/[0.06] overflow-hidden rounded-xl border border-fg/[0.08] bg-card">
          {zonasVisibles.map((z) => {
            const sel = z.value === draftTimezone
            return (
              <button
                key={z.value}
                type="button"
                onClick={() => setDraftTimezone(z.value)}
                className={[
                  'min-h-[44px] w-full px-4 py-3 text-left text-sm transition-colors',
                  sel
                    ? 'bg-[var(--tenant-primary)] font-semibold text-[var(--tenant-on-primary)]'
                    : 'text-fg-soft hover:bg-fg/[0.04]',
                ].join(' ')}
              >
                {z.label}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={() => setZonasExpandidas((v) => !v)}
          className="mt-2 text-xs text-tenant-text hover:underline"
        >
          {zonasExpandidas ? 'Ver menos' : 'Ver más zonas'}
        </button>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold text-fg-soft">Por día</h2>
        <div className="space-y-3">
          {CLAVES_DIA_LABORAL.map((dia) => {
            const slot = draftHours[dia]
            const abierto = slot !== null && slot !== undefined
            return (
              <div key={dia} className="rounded-xl border border-fg/[0.08] bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-fg">{ETIQUETA_DIA_LABORAL[dia]}</span>
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-fg-muted">
                    Abierto
                    <input
                      type="checkbox"
                      checked={abierto}
                      onChange={(e) => setDiaAbierto(dia, e.target.checked)}
                      className="h-5 w-5 rounded accent-[var(--tenant-primary)]"
                    />
                  </label>
                </div>
                {abierto && slot ? (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] uppercase tracking-wide text-fg-subtle">
                        Apertura
                      </span>
                      <input
                        value={slot.open}
                        onChange={(e) => setHorasDia(dia, 'open', e.target.value)}
                        placeholder="09:00"
                        className="mt-1 w-full rounded-lg border border-fg/[0.1] bg-app px-3 py-2 text-base text-fg placeholder:text-fg-subtle md:text-sm"
                        maxLength={5}
                      />
                    </div>
                    <div>
                      <span className="text-[11px] uppercase tracking-wide text-fg-subtle">
                        Cierre
                      </span>
                      <input
                        value={slot.close}
                        onChange={(e) => setHorasDia(dia, 'close', e.target.value)}
                        placeholder="18:00"
                        className="mt-1 w-full rounded-lg border border-fg/[0.1] bg-app px-3 py-2 text-base text-fg placeholder:text-fg-subtle md:text-sm"
                        maxLength={5}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
