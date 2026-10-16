import Image from 'next/image'
import type { ReactNode } from 'react'

/** Clases de input de las pantallas de acceso (login, registro, recuperar). */
export const AUTH_INPUT_CLASS =
  'w-full rounded-xl border border-white/[0.10] bg-zinc-800 py-2.5 pl-10 pr-4 text-white placeholder:text-zinc-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#40E0D0]'

export const AUTH_SUBMIT_CLASS =
  'w-full rounded-xl bg-geema-gradient py-3 font-semibold text-white shadow-[0_8px_30px_rgba(64,224,208,0.22)] transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#40E0D0] focus:ring-offset-2 focus:ring-offset-[#0F0F0F] disabled:opacity-60'

/** Marco oscuro con logo para login, registro y recuperar contraseña. */
export function AuthScreen({
  title,
  subtitle,
  children,
  footer,
  intro,
}: {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
  /** Contenido entre el encabezado y la tarjeta (p. ej. los pasos de /registro). */
  intro?: ReactNode
}) {
  return (
    <div className="dark">
      <div className="flex min-h-screen flex-col bg-[#0F0F0F]">
        <main className="flex flex-1 items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center">
              <Image
                src="/logo-diamondSparkleNGlow.svg"
                alt="GeemaStudio"
                width={160}
                height={160}
                className="mx-auto -mb-2"
                priority
              />
              <h1 className="text-xl font-bold text-white">{title}</h1>
              <p className="mx-auto mt-2 max-w-xs text-sm text-zinc-400">{subtitle}</p>
            </div>
            {intro}
            <div className="space-y-5 rounded-2xl border border-white/[0.08] bg-zinc-900 p-6 shadow-sm">
              {children}
            </div>
            {footer ? <div className="mt-6 text-center text-sm text-zinc-400">{footer}</div> : null}
          </div>
        </main>
      </div>
    </div>
  )
}

export function AuthError({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-300"
    >
      {children}
    </div>
  )
}

export function AuthField({
  id,
  label,
  icon,
  children,
  hint,
}: {
  id: string
  label: string
  icon: ReactNode
  children: ReactNode
  hint?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-zinc-300">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
          {icon}
        </span>
        {children}
      </div>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  )
}
