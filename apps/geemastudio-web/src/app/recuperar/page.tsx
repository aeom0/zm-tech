'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Hash, KeyRound, Mail } from 'lucide-react'
import { resetPasswordWithCode, sendPasswordResetCode } from '@geemastudio/data'

import {
  AUTH_INPUT_CLASS,
  AUTH_SUBMIT_CLASS,
  AuthError,
  AuthField,
  AuthScreen,
} from '@/components/auth/AuthScreen'
import { supabase } from '@/lib/supabase'

const ICON = 'h-4 w-4'

export default function RecuperarPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const run = async (action: () => Promise<void>) => {
    if (!supabase) {
      setError('No se pudo conectar. Intenta de nuevo más tarde.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const sendCode = (e: React.FormEvent) => {
    e.preventDefault()
    void run(async () => {
      await sendPasswordResetCode(supabase!, email)
      setCodeSent(true)
    })
  }

  const reset = (e: React.FormEvent) => {
    e.preventDefault()
    void run(async () => {
      await resetPasswordWithCode(supabase!, email, code, password)
      router.replace('/panel')
      router.refresh()
    })
  }

  return (
    <AuthScreen
      title="Recupera tu contraseña"
      subtitle={
        codeSent
          ? `Si ${email.trim()} tiene cuenta, le enviamos un código de 6 dígitos.`
          : 'Te enviaremos un código a tu correo.'
      }
      footer={
        <Link href="/login" className="font-semibold text-[#40E0D0] hover:underline">
          Volver al login
        </Link>
      }
    >
      {error && <AuthError>{error}</AuthError>}

      {!codeSent ? (
        <form onSubmit={sendCode} className="space-y-5">
          <AuthField id="email" label="Correo" icon={<Mail className={ICON} />}>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={AUTH_INPUT_CLASS}
              placeholder="correo@negocio.com"
              required
            />
          </AuthField>
          <button type="submit" disabled={loading} className={AUTH_SUBMIT_CLASS}>
            {loading ? 'Enviando…' : 'Enviar código'}
          </button>
        </form>
      ) : (
        <form onSubmit={reset} className="space-y-5">
          <AuthField id="code" label="Código" icon={<Hash className={ICON} />}>
            <input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className={`${AUTH_INPUT_CLASS} font-mono tracking-[0.3em]`}
              placeholder="000000"
              required
            />
          </AuthField>
          <AuthField
            id="password"
            label="Contraseña nueva"
            icon={<KeyRound className={ICON} />}
            hint="Mínimo 8 caracteres"
          >
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={AUTH_INPUT_CLASS}
              minLength={8}
              maxLength={72}
              required
            />
          </AuthField>
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className={AUTH_SUBMIT_CLASS}
          >
            {loading ? 'Guardando…' : 'Cambiar contraseña'}
          </button>
          <button
            type="button"
            onClick={() => {
              setCodeSent(false)
              setCode('')
            }}
            className="w-full text-sm text-zinc-400 hover:text-white"
          >
            Usar otro correo o reenviar
          </button>
        </form>
      )}
    </AuthScreen>
  )
}
