'use client'

import { useState } from 'react'
import { History, Send } from 'lucide-react'

import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StateNote } from '@/components/ui/StateNote'
import { useAuth } from '@/contexts/AuthContext'
import { useOnboardingStatus } from '@/hooks/onboarding/useOnboardingStatus'

import { PromoHistory } from './PromoHistory'
import { PromoWizard } from './PromoWizard'

type View = 'nueva' | 'historial'

const VIEWS = [
  { value: 'nueva', label: 'Nueva promo', icon: <Send className="h-4 w-4" /> },
  { value: 'historial', label: 'Historial', icon: <History className="h-4 w-4" /> },
] as const

export function PromosClient() {
  const { isAdmin, isLoading } = useAuth()
  const [view, setView] = useState<View>('nueva')
  const { data: status } = useOnboardingStatus()
  // Plan 19 W13: el envío masivo exige correo confirmado (la Edge también lo valida).
  const emailPending = status != null && status.emailVerifiedAt === null

  if (!isLoading && !isAdmin) {
    return <StateNote kind="warning">Solo el dueño del negocio puede enviar promos.</StateNote>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-fg sm:text-2xl">Promo por WhatsApp</h1>
          <p className="mt-1 max-w-prose text-sm text-fg-muted">
            Envía una promo con imagen a tus clientas con la plantilla aprobada por Meta. No llega a
            números bloqueados ni a quienes pidieron no recibir promos.
          </p>
        </div>
        <SegmentedControl options={VIEWS} value={view} onChange={setView} ariaLabel="Vista de promos" />
      </div>

      {view === 'historial' ? (
        <PromoHistory />
      ) : emailPending ? (
        <StateNote kind="warning">
          Confirma tu correo para enviar promos. Usa el aviso de arriba para recibir el código.
        </StateNote>
      ) : (
        <PromoWizard onShowHistory={() => setView('historial')} />
      )}
    </div>
  )
}
