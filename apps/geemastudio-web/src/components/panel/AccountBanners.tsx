'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Clock, MailCheck } from 'lucide-react'
import {
  OnboardingError,
  queryKeys,
  sendEmailVerificationCode,
  verifyEmailCode,
} from '@geemastudio/data'

import { Button } from '@/components/ui/Button'
import { CodeInput } from '@/components/ui/CodeInput'
import { StateNote } from '@/components/ui/StateNote'
import { supabase } from '@/lib/supabase'

/** Aviso del trial a partir de estos días restantes. */
const TRIAL_WARNING_DAYS = 3

/** «Más tarde» pliega el aviso hasta la próxima sesión del navegador. */
const EMAIL_COLLAPSED_KEY = 'geema.emailBanner.collapsed'
const RESEND_COOLDOWN_S = 60

function readCollapsed(): boolean {
  try {
    return window.sessionStorage.getItem(EMAIL_COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

function EmailVerificationBanner({ email }: { email: string }) {
  const router = useRouter()
  const qc = useQueryClient()
  const [collapsed, setCollapsed] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    setCollapsed(readCollapsed())
  }, [])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = window.setTimeout(() => setCooldown((s) => s - 1), 1000)
    return () => window.clearTimeout(t)
  }, [cooldown])

  const setCollapsedPersist = (value: boolean) => {
    setCollapsed(value)
    try {
      if (value) window.sessionStorage.setItem(EMAIL_COLLAPSED_KEY, '1')
      else window.sessionStorage.removeItem(EMAIL_COLLAPSED_KEY)
    } catch {
      // sin almacenamiento: solo cambia en esta vista
    }
  }

  const run = async (action: () => Promise<void>) => {
    if (!supabase) return
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof OnboardingError ? err.message : 'Error de conexión. Intenta de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  const send = () =>
    run(async () => {
      await sendEmailVerificationCode(supabase!, email)
      setCodeSent(true)
      setCode('')
      setCooldown(RESEND_COOLDOWN_S)
    })

  const verify = (value: string) =>
    run(async () => {
      await verifyEmailCode(supabase!, email, value)
      await qc.invalidateQueries({ queryKey: queryKeys.onboarding.all })
      router.refresh()
    })

  const changeCode = (value: string) => {
    setCode(value)
    // Al completar los 6 dígitos (escritos o pegados) se confirma solo.
    if (value.length === 6 && !busy) void verify(value)
  }

  if (collapsed) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] px-4 py-2.5 text-sm">
        <MailCheck className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" aria-hidden />
        <p className="flex-1 text-fg-soft">Tu correo sigue sin confirmar.</p>
        <button
          type="button"
          onClick={() => setCollapsedPersist(false)}
          className="font-semibold text-tenant-text hover:underline"
        >
          Confirmar
        </button>
      </div>
    )
  }

  return (
    <section className="rounded-2xl border border-amber-500/30 bg-card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
          <MailCheck className="h-5 w-5 text-amber-600 dark:text-amber-300" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-fg">Confirma tu correo</p>
          <p className="mt-0.5 text-sm text-fg-muted">
            {codeSent ? (
              <>
                Escribe el código de 6 dígitos que enviamos a{' '}
                <span className="break-all font-medium text-fg-soft">{email}</span>. Revisa también
                spam.
              </>
            ) : (
              'Lo necesitas para conectar WhatsApp y enviar promos masivas. Te enviamos un código por correo.'
            )}
          </p>
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-sm font-medium text-red-700 dark:text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      {codeSent ? (
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            void verify(code)
          }}
        >
          <CodeInput value={code} onChange={changeCode} autoFocus />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              type="submit"
              variant="primary"
              loading={busy}
              disabled={code.length !== 6}
              className="w-full sm:w-auto"
            >
              Confirmar correo
            </Button>
            <Button
              variant="ghost"
              onClick={() => void send()}
              disabled={busy || cooldown > 0}
              className="w-full sm:w-auto"
            >
              {cooldown > 0 ? `Reenviar en ${cooldown} s` : 'Reenviar código'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button variant="primary" loading={busy} onClick={() => void send()} className="w-full sm:w-auto">
            Enviar código
          </Button>
          <Button variant="ghost" onClick={() => setCollapsedPersist(true)} className="w-full sm:w-auto">
            Más tarde
          </Button>
        </div>
      )}
    </section>
  )
}

function TrialBanner({ daysLeft }: { daysLeft: number }) {
  return (
    <StateNote kind="warning" icon={<Clock className="mb-1 h-4 w-4" aria-hidden />}>
      <p>
        {daysLeft === 0
          ? 'Tu prueba gratis del plan Pro terminó. Elige tu plan para seguir sin interrupciones.'
          : `Te ${daysLeft === 1 ? 'queda 1 día' : `quedan ${daysLeft} días`} de prueba del plan Pro.`}{' '}
        <Link href="/panel/configuracion/plan" className="font-semibold underline">
          Ver planes
        </Link>
      </p>
    </StateNote>
  )
}

/** Avisos de cuenta del panel (Plan 19 W13): correo sin confirmar y fin del trial. */
export function AccountBanners({
  email,
  emailVerified,
  trialDaysLeft,
}: {
  email: string | null
  emailVerified: boolean
  trialDaysLeft: number | null
}) {
  const showEmail = !emailVerified && Boolean(email)
  const showTrial = trialDaysLeft !== null && trialDaysLeft <= TRIAL_WARNING_DAYS
  if (!showEmail && !showTrial) return null

  return (
    <div className="mx-auto mb-4 max-w-5xl space-y-3 md:mb-6">
      {showEmail && email ? <EmailVerificationBanner email={email} /> : null}
      {showTrial ? <TrialBanner daysLeft={trialDaysLeft} /> : null}
    </div>
  )
}
