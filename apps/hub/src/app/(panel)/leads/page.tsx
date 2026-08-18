import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { ConvertirLeadBtn } from '@/components/leads/ConvertirLeadBtn'
import { leadsCopy } from '@/lib/content'
import { fmtFecha, fmtUsd } from '@/lib/status-helpers'
import type { ContactoLanding, QuoteLead } from '@/types/leads'

export default async function LeadsPage() {
  const supabase = await createClient()

  const [contactosRes, quoteLeadsRes, clientesConRefRes] = await Promise.all([
    supabase
      .from('contacts')
      .select('id, nombre, empresa, whatsapp, presupuesto, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('quote_leads')
      .select('id, created_at, source, slug, cliente_nombre, cliente_contacto, total, status')
      .order('created_at', { ascending: false }),
    supabase
      .from('hub_clients')
      .select('id, source_contact_id, source_quote_lead_id')
      .or('source_contact_id.not.is.null,source_quote_lead_id.not.is.null'),
  ])

  const contactos = (contactosRes.data ?? []) as ContactoLanding[]
  const quoteLeads = (quoteLeadsRes.data ?? []) as QuoteLead[]
  const clientesConRef = clientesConRefRes.data ?? []

  const convertidosContactSet = new Set(
    clientesConRef.map((c) => c.source_contact_id).filter((id): id is string => Boolean(id))
  )
  const convertidosQuoteLeadSet = new Set(
    clientesConRef.map((c) => c.source_quote_lead_id).filter((id): id is string => Boolean(id))
  )
  const clientePorContactId = new Map(
    clientesConRef
      .filter((c) => c.source_contact_id)
      .map((c) => [c.source_contact_id as string, c.id])
  )
  const clientePorQuoteLeadId = new Map(
    clientesConRef
      .filter((c) => c.source_quote_lead_id)
      .map((c) => [c.source_quote_lead_id as string, c.id])
  )

  const totalLeads = contactos.length + quoteLeads.length
  const sinConvertir =
    contactos.filter((c) => !convertidosContactSet.has(c.id)).length +
    quoteLeads.filter((q) => !convertidosQuoteLeadSet.has(q.id)).length

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-foreground text-2xl font-semibold">{leadsCopy.titulo}</h1>
        <p className="text-muted mt-0.5 text-sm">
          {totalLeads} lead{totalLeads !== 1 ? 's' : ''} total ·{' '}
          <span className="text-warning">{sinConvertir} sin convertir</span>
        </p>
      </div>

      {totalLeads === 0 ? (
        <Card>
          <CardContent className="text-muted py-12 text-center text-sm">
            {leadsCopy.sinLeads}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Contactos (formulario landing) */}
          {contactos.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-muted text-sm font-semibold tracking-wide uppercase">
                {leadsCopy.origenLanding} ({contactos.length})
              </h2>
              <div className="space-y-3">
                {contactos.map((c) => {
                  const convertido = convertidosContactSet.has(c.id)
                  const clienteId = clientePorContactId.get(c.id)
                  return (
                    <Card key={c.id} className={convertido ? 'opacity-60' : ''}>
                      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-foreground font-medium">
                              {c.nombre ?? 'Sin nombre'}
                            </p>
                            {convertido ? (
                              <Badge variant="success">{leadsCopy.convertido}</Badge>
                            ) : (
                              <Badge variant="warning">{leadsCopy.sinConvertir}</Badge>
                            )}
                          </div>
                          {c.empresa ? <p className="text-muted text-xs">{c.empresa}</p> : null}
                          {c.whatsapp ? (
                            <p className="text-muted text-xs">WhatsApp: {c.whatsapp}</p>
                          ) : null}
                          {c.presupuesto ? (
                            <p className="text-muted text-xs">Presupuesto: {c.presupuesto}</p>
                          ) : null}
                          <p className="text-muted/60 text-xs">{fmtFecha(c.created_at)}</p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          {convertido && clienteId ? (
                            <Link
                              href={`/clientes/${clienteId}`}
                              className="border-border text-muted hover:text-foreground inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition"
                            >
                              {leadsCopy.verCliente}
                            </Link>
                          ) : (
                            <ConvertirLeadBtn
                              leadId={c.id}
                              origen="landing"
                              nombre={c.nombre ?? 'Sin nombre'}
                              contacto={c.whatsapp}
                            />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </section>
          ) : null}

          {/* Quote leads (cotizador) */}
          {quoteLeads.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-muted text-sm font-semibold tracking-wide uppercase">
                {leadsCopy.origenCotizador} ({quoteLeads.length})
              </h2>
              <div className="space-y-3">
                {quoteLeads.map((q) => {
                  const convertido = convertidosQuoteLeadSet.has(q.id)
                  const clienteId = clientePorQuoteLeadId.get(q.id)
                  return (
                    <Card key={q.id} className={convertido ? 'opacity-60' : ''}>
                      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-foreground font-medium">
                              {q.cliente_nombre ?? 'Sin nombre'}
                            </p>
                            {convertido ? (
                              <Badge variant="success">{leadsCopy.convertido}</Badge>
                            ) : (
                              <Badge variant="warning">{leadsCopy.sinConvertir}</Badge>
                            )}
                            {q.status ? <Badge variant="muted">{q.status}</Badge> : null}
                          </div>
                          {q.cliente_contacto ? (
                            <p className="text-muted text-xs">Contacto: {q.cliente_contacto}</p>
                          ) : null}
                          {q.total ? (
                            <p className="text-muted text-xs">Total: {fmtUsd(q.total)}</p>
                          ) : null}
                          {q.slug ? (
                            <p className="text-muted text-xs">
                              {leadsCopy.servicioLabel}: {q.slug}
                            </p>
                          ) : null}
                          <p className="text-muted/60 text-xs">{fmtFecha(q.created_at)}</p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          {convertido && clienteId ? (
                            <Link
                              href={`/clientes/${clienteId}`}
                              className="border-border text-muted hover:text-foreground inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition"
                            >
                              {leadsCopy.verCliente}
                            </Link>
                          ) : (
                            <ConvertirLeadBtn
                              leadId={q.id}
                              origen="cotizador"
                              nombre={q.cliente_nombre ?? 'Sin nombre'}
                              contacto={q.cliente_contacto}
                            />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  )
}
