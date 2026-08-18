'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  HUB_CLIENT_STATUSES,
  HUB_CLIENT_SOURCES,
  HUB_VERTICALS,
  HUB_CLIENT_STATUS_LABELS,
  HUB_CLIENT_SOURCE_LABELS,
  HUB_VERTICAL_LABELS,
} from '@zmtech/hub-schema'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { clientesCopy, shellCopy } from '@/lib/content'
import { crearCliente, actualizarCliente } from '@/lib/actions/clientes'
import type { ClienteFormValues } from '@/lib/validation/clientes'
import type { HubClient } from '@zmtech/hub-schema'

interface ClienteFormProps {
  cliente?: HubClient
  onSuccess?: (id: string) => void
}

const estadoOptions = HUB_CLIENT_STATUSES.map((s) => ({
  value: s,
  label: HUB_CLIENT_STATUS_LABELS[s],
}))

const origenOptions = HUB_CLIENT_SOURCES.map((s) => ({
  value: s,
  label: HUB_CLIENT_SOURCE_LABELS[s],
}))

const verticalOptions = HUB_VERTICALS.map((v) => ({
  value: v,
  label: HUB_VERTICAL_LABELS[v],
}))

export function ClienteForm({ cliente, onSuccess }: ClienteFormProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [values, setValues] = useState<ClienteFormValues>({
    name: cliente?.name ?? '',
    contactName: cliente?.contactName ?? '',
    email: cliente?.email ?? '',
    phone: cliente?.phone ?? '',
    whatsapp: cliente?.whatsapp ?? '',
    country: cliente?.country ?? '',
    city: cliente?.city ?? '',
    vertical: cliente?.vertical ?? 'otro',
    status: cliente?.status ?? 'activo',
    source: cliente?.source ?? 'directo',
    sourceContactId: cliente?.sourceContactId ?? null,
    sourceQuoteLeadId: cliente?.sourceQuoteLeadId ?? null,
    notes: cliente?.notes ?? '',
  })

  function set<K extends keyof ClienteFormValues>(key: K, value: ClienteFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const result = cliente
        ? await actualizarCliente(cliente.id, values)
        : await crearCliente(values)

      if (!result.ok) {
        setError(result.error)
        return
      }

      const id = cliente?.id ?? (result as { ok: true; data: { id: string } }).data.id
      if (onSuccess) {
        onSuccess(id)
      } else {
        router.push(`/clientes/${id}`)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={clientesCopy.nombreLabel}
          required
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
        />
        <Input
          label={clientesCopy.contactoLabel}
          value={values.contactName ?? ''}
          onChange={(e) => set('contactName', e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={clientesCopy.emailLabel}
          type="email"
          value={values.email ?? ''}
          onChange={(e) => set('email', e.target.value)}
        />
        <Input
          label={clientesCopy.telefonoLabel}
          value={values.phone ?? ''}
          onChange={(e) => set('phone', e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={clientesCopy.whatsappLabel}
          value={values.whatsapp ?? ''}
          onChange={(e) => set('whatsapp', e.target.value)}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={clientesCopy.paisLabel}
            value={values.country ?? ''}
            onChange={(e) => set('country', e.target.value)}
          />
          <Input
            label={clientesCopy.ciudadLabel}
            value={values.city ?? ''}
            onChange={(e) => set('city', e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Select
          label={clientesCopy.verticalLabel}
          options={verticalOptions}
          value={values.vertical}
          onChange={(e) => set('vertical', e.target.value as ClienteFormValues['vertical'])}
        />
        <Select
          label={clientesCopy.estadoLabel}
          options={estadoOptions}
          value={values.status}
          onChange={(e) => set('status', e.target.value as ClienteFormValues['status'])}
        />
        <Select
          label={clientesCopy.origenLabel}
          options={origenOptions}
          value={values.source}
          onChange={(e) => set('source', e.target.value as ClienteFormValues['source'])}
        />
      </div>

      <Textarea
        label={clientesCopy.notasLabel}
        value={values.notes ?? ''}
        onChange={(e) => set('notes', e.target.value)}
        rows={4}
      />

      {error ? (
        <p className="border-danger/30 bg-danger/10 text-danger rounded-lg border px-4 py-2 text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={() => router.back()}>
          {shellCopy.cancelar}
        </Button>
        <Button variant="primary" loading={pending} onClick={handleSubmit}>
          {shellCopy.guardar}
        </Button>
      </div>
    </div>
  )
}
