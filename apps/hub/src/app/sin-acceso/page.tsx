'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldOff } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { authCopy, brand } from '@/lib/content'

export default function SinAccesoPage() {
  const router = useRouter()
  const { isLoading, token, member, sinAcceso, logout } = useAuth()

  useEffect(() => {
    if (isLoading) return
    if (!token) {
      router.replace('/login')
      return
    }
    if (member && !sinAcceso) {
      router.replace('/dashboard')
    }
  }, [isLoading, token, member, sinAcceso, router])

  if (isLoading || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="bg-surface h-32 w-full max-w-md animate-pulse rounded-xl" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="border-border bg-surface w-full max-w-md rounded-xl border p-8 text-center">
        <div className="bg-accent-soft text-accent mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
          <ShieldOff className="h-6 w-6" />
        </div>
        <h1 className="font-display text-foreground text-xl font-semibold">
          {authCopy.noAccessTitle}
        </h1>
        <p className="text-muted mt-3 text-sm leading-relaxed">{authCopy.noAccessBody}</p>
        <p className="text-muted mt-2 text-xs">{authCopy.schemaMissingHint}</p>
        <p className="text-muted mt-4 text-xs">
          {brand.name} · {brand.product}
        </p>
        <button
          type="button"
          onClick={async () => {
            await logout()
            router.replace('/login')
          }}
          className="border-border text-foreground hover:border-accent hover:text-accent mt-6 w-full rounded-lg border py-2.5 text-sm transition"
        >
          {authCopy.noAccessLogout}
        </button>
      </div>
    </div>
  )
}
