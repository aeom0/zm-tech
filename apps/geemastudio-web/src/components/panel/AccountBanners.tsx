'use client'

import { useState } from 'react'
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
import { StateNote } from '@/components/ui/StateNote'
import { supabase } from '@/lib/supabase'

/** Aviso del trial a partir de estos días restantes. */
const TRIAL_WARNING_DAYS = 3

function EmailVerificationBanner({ email }: { email: string }) {
  const router = useRouter()
  const qc = useQueryClient()
  const [codeSent, setCodeSent] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    })

  const verify = () =>
    run(async () => {
      await verifyEmailCode(supabase!, email, code)
      await qc.invalidateQueries({ queryKey: queryKeys.onboarding.all })
      router.refresh()
    })

  return (
    <StateNote kind="warning" icon={<MailCheck className="mb-1 h-4 w-4" aria-hidden />}>
      <p className="font-semibold">Confirma tu correo</p>
      <p className="mt-0.5">
        {codeSent
          ? `Te enviamos un código de 6 dígitos a ${email}.`
          : 'Lo necesitas para conectar WhatsApp y enviar promos masivas.'}
      </p>
      {error ? <p className="mt-1 font-medium text-red-700 dark:text-red-300">{error}</p> : null}
      {codeSent ? (
        <form
          className="mt-3 flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void verify()
          }}
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            aria-label="Código de 6 dígitos"
            className="w-32 rounded-xl border border-line-strong bg-surface px-3 py-2 text-center font-mono text-base tracking-[0.3em] text-fg focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]"
          />
          <Button type="submit" variant="primary" size="sm" loading={busy} disabled={code.length !== 6}>
            Confirmar
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void send()} disabled={busy}>
            Reenviar
          </Button>
        </form>
      ) : (
        <div className="mt-3">
          <Button variant="primary" size="sm" loading={busy} onClick={() => void send()}>
            Enviar código
          </Button>
        </div>
      )}
    </StateNote>
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
