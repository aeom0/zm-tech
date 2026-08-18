import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { HUB_CLIENT_STATUS_LABELS, HUB_VERTICAL_LABELS } from '@zmtech/hub-schema'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { clientesCopy } from '@/lib/content'
import { variantClienteStatus } from '@/lib/status-helpers'
import type { HubClient } from '@zmtech/hub-schema'

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; vertical?: string }>
}) {
  const { estado, vertical } = await searchParams
  const supabase = await createClient()

  let query = supabase.from('hub_clients').select('*').order('created_at', { ascending: false })

  if (estado) query = query.eq('status', estado)
  if (vertical) query = query.eq('vertical', vertical)

  const { data: clientes, error } = await query

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-foreground text-2xl font-semibold">
            {clientesCopy.titulo}
          </h1>
          <p className="text-muted mt-0.5 text-sm">{clientesCopy.subtitulo}</p>
        </div>
        <Link
          href="/clientes/nuevo"
          className="bg-accent hover:bg-accent-hover inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition"
        >
          <Plus className="h-4 w-4" />
          {clientesCopy.nuevo}
        </Link>
      </div>

      <FiltrosClientes estado={estado} vertical={vertical} />

      {error ? (
        <p className="border-danger/30 bg-danger/10 text-danger rounded-lg border p-4 text-sm">
          {error.message}
        </p>
      ) : null}

      {!clientes || clientes.length === 0 ? (
        <Card>
          <CardContent className="text-muted py-12 text-center text-sm">
            {clientesCopy.sinClientes}
          </CardContent>
        </Card>
      ) : (
        <ClientesGrid clientes={clientes as HubClient[]} />
      )}
    </div>
  )
}

function FiltrosClientes({ estado, vertical }: { estado?: string; vertical?: string }) {
  const estadoOpts = ['', 'lead', 'activo', 'pausado', 'cerrado'] as const
  const verticalOpts = [
    '',
    'beauty',
    'inmobiliaria',
    'wellness',
    'automotriz',
    'sports',
    'enterprise',
    'salud',
    'otro',
  ] as const

  return (
    <form method="GET" className="flex flex-wrap gap-3">
      <select
        name="estado"
        defaultValue={estado ?? ''}
        className="border-border bg-surface text-foreground focus:border-accent/60 rounded-lg border px-3 py-2 text-sm focus:outline-none"
      >
        <option value="">Estado: todos</option>
        {estadoOpts
          .filter((e) => e !== '')
          .map((e) => (
            <option key={e} value={e}>
              {HUB_CLIENT_STATUS_LABELS[e]}
            </option>
          ))}
      </select>
      <select
        name="vertical"
        defaultValue={vertical ?? ''}
        className="border-border bg-surface text-foreground focus:border-accent/60 rounded-lg border px-3 py-2 text-sm focus:outline-none"
      >
        <option value="">Vertical: todas</option>
        {verticalOpts
          .filter((v) => v !== '')
          .map((v) => (
            <option key={v} value={v}>
              {HUB_VERTICAL_LABELS[v]}
            </option>
          ))}
      </select>
      <button
        type="submit"
        className="border-border bg-surface text-muted hover:text-foreground rounded-lg border px-4 py-2 text-sm transition"
      >
        Filtrar
      </button>
      {estado || vertical ? (
        <Link
          href="/clientes"
          className="border-border bg-surface text-muted hover:text-foreground rounded-lg border px-4 py-2 text-sm transition"
        >
          Limpiar
        </Link>
      ) : null}
    </form>
  )
}

function ClientesGrid({ clientes }: { clientes: HubClient[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {clientes.map((c) => (
        <Link key={c.id} href={`/clientes/${c.id}`}>
          <Card className="hover:border-accent/30 h-full cursor-pointer transition-colors">
            <CardHeader className="pb-2">
              <div className="min-w-0">
                <p className="text-foreground truncate font-semibold">{c.name}</p>
                {c.contactName ? (
                  <p className="text-muted truncate text-xs">{c.contactName}</p>
                ) : null}
              </div>
              <Badge variant={variantClienteStatus(c.status)}>
                {HUB_CLIENT_STATUS_LABELS[c.status]}
              </Badge>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                <Badge variant="muted">{HUB_VERTICAL_LABELS[c.vertical]}</Badge>
                {c.city ? <span className="text-muted text-xs">{c.city}</span> : null}
              </div>
              {c.email ? <p className="text-muted mt-2 truncate text-xs">{c.email}</p> : null}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
