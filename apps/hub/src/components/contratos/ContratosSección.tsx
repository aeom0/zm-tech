'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ContratoForm } from './ContratoForm'
import { eliminarContrato } from '@/lib/actions/contratos'
import { contratoCopy, clientesCopy } from '@/lib/content'
import { fmtUsd, fmtFecha } from '@/lib/status-helpers'
import type { HubContract, HubProject } from '@zmtech/hub-schema'

interface ContratosSecciónProps {
  clientId: string
  contratos: HubContract[]
  proyectos: Pick<HubProject, 'id' | 'name'>[]
}

export function ContratosSección({ clientId, contratos, proyectos }: ContratosSecciónProps) {
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState<HubContract | null>(null)
  const [listaLocal, setListaLocal] = useState(contratos)
  const [eliminando, setEliminando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleEliminar(id: string) {
    if (!confirm('¿Eliminar este contrato?')) return
    setEliminando(id)
    const result = await eliminarContrato(id, clientId)
    setEliminando(null)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setListaLocal((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{clientesCopy.fichaContratos}</CardTitle>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setEditando(null)
            setMostrarForm(true)
          }}
        >
          <Plus className="h-4 w-4" />
          {clientesCopy.nuevoContrato}
        </Button>
      </CardHeader>
      <CardContent>
        {mostrarForm || editando ? (
          <div className="border-border mb-4 rounded-lg border p-4">
            <ContratoForm
              clientId={clientId}
              contrato={editando ?? undefined}
              proyectos={proyectos}
              onDone={() => {
                setMostrarForm(false)
                setEditando(null)
              }}
            />
          </div>
        ) : null}

        {error ? <p className="text-danger mb-3 text-sm">{error}</p> : null}

        {listaLocal.length === 0 && !mostrarForm ? (
          <p className="text-muted text-sm">{clientesCopy.sinContratos}</p>
        ) : (
          <div className="space-y-3">
            {listaLocal.map((c) => (
              <div
                key={c.id}
                className="border-border bg-surface-elevated flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-foreground font-medium">{fmtUsd(c.amountUsd)}</span>
                    <span className="text-muted text-xs">{c.paymentModel}</span>
                    {c.supportActive ? (
                      <Badge variant="success">
                        <ShieldCheck className="mr-1 h-3 w-3" />
                        {contratoCopy.soporteActivoLabel}
                      </Badge>
                    ) : null}
                  </div>
                  {c.monthlySupportUsd ? (
                    <p className="text-muted text-xs">Soporte: {fmtUsd(c.monthlySupportUsd)}/mes</p>
                  ) : null}
                  {c.startDate ? (
                    <p className="text-muted text-xs">
                      Inicio: {fmtFecha(c.startDate)}
                      {c.deliveredAt ? ` · Entrega: ${fmtFecha(c.deliveredAt)}` : ''}
                    </p>
                  ) : null}
                  {c.notes ? <p className="text-muted text-xs">{c.notes}</p> : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditando(c)
                      setMostrarForm(false)
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    loading={eliminando === c.id}
                    onClick={() => void handleEliminar(c.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
