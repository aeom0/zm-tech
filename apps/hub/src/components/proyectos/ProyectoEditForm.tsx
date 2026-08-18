'use client'

import { useState } from 'react'
import { Pencil, ChevronUp } from 'lucide-react'
import { ProyectoForm } from './ProyectoForm'
import { shellCopy } from '@/lib/content'
import type { HubProject, HubClient } from '@zmtech/hub-schema'

interface ProyectoEditFormProps {
  proyecto: HubProject
  clientes?: Pick<HubClient, 'id' | 'name'>[]
}

export function ProyectoEditForm({ proyecto, clientes = [] }: ProyectoEditFormProps) {
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
          {shellCopy.editar} datos del proyecto
        </span>
        <ChevronUp
          className={`h-4 w-4 transition-transform ${abierto ? 'rotate-0' : 'rotate-180'}`}
        />
      </button>
      {abierto ? (
        <div className="border-border border-t px-5 pt-4 pb-5">
          <ProyectoForm
            proyecto={proyecto}
            clientes={clientes}
            onSuccess={() => setAbierto(false)}
          />
        </div>
      ) : null}
    </div>
  )
}
