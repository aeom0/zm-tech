'use client'

import { useState } from 'react'
import { Pencil, ChevronUp } from 'lucide-react'
import { ClienteForm } from './ClienteForm'
import { shellCopy } from '@/lib/content'
import type { HubClient } from '@zmtech/hub-schema'

interface ClienteEditFormProps {
  cliente: HubClient
}

export function ClienteEditForm({ cliente }: ClienteEditFormProps) {
  const [abierto, setAbierto] = useState(false)

  return (
    <div className="border-border bg-surface rounded-xl border">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="text-muted hover:text-foreground flex w-full items-center justify-between px-5 py-4 text-sm font-medium"
      >
        <span className="flex items-center gap-2">
          <Pencil className="h-4 w-4" />
          {shellCopy.editar} datos del cliente
        </span>
        <ChevronUp
          className={`h-4 w-4 transition-transform ${abierto ? 'rotate-0' : 'rotate-180'}`}
        />
      </button>
      {abierto ? (
        <div className="border-border border-t px-5 pt-4 pb-5">
          <ClienteForm cliente={cliente} onSuccess={() => setAbierto(false)} />
        </div>
      ) : null}
    </div>
  )
}
