import Link from 'next/link'
import { Briefcase, FolderKanban, Inbox, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/Card'
import { dashboardCopy } from '@/lib/content'

interface KpiCardProps {
  titulo: string
  valor: number
  icono: React.ReactNode
  href?: string
  colorClass?: string
}

function KpiCard({ titulo, valor, icono, href, colorClass = 'text-accent' }: KpiCardProps) {
  const inner = (
    <Card className="hover:border-accent/30 transition-colors">
      <CardContent className="flex items-start gap-4 p-5">
        <div
          className={`bg-accent-soft flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colorClass}`}
        >
          {icono}
        </div>
        <div>
          <p className="font-display text-foreground text-2xl font-bold">{valor}</p>
          <p className="text-muted text-xs font-medium tracking-wide uppercase">{titulo}</p>
        </div>
      </CardContent>
    </Card>
  )

  if (href) {
    return <Link href={href}>{inner}</Link>
  }
  return inner
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    clientesActivos,
    proyectosDesarrollo,
    proyectosProduccion,
    soporteActivo,
    totalContacts,
    totalQuoteLeads,
    convertidosContact,
    convertidosQuoteLead,
  ] = await Promise.all([
    supabase
      .from('hub_clients')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'activo'),
    supabase
      .from('hub_projects')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'desarrollo'),
    supabase
      .from('hub_projects')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'produccion'),
    supabase
      .from('hub_contracts')
      .select('id', { count: 'exact', head: true })
      .eq('support_active', true),
    supabase.from('contacts').select('id', { count: 'exact', head: true }),
    supabase.from('quote_leads').select('id', { count: 'exact', head: true }),
    supabase
      .from('hub_clients')
      .select('source_contact_id', { count: 'exact', head: true })
      .not('source_contact_id', 'is', null),
    supabase
      .from('hub_clients')
      .select('source_quote_lead_id', { count: 'exact', head: true })
      .not('source_quote_lead_id', 'is', null),
  ])

  const totalLeads = (totalContacts.count ?? 0) + (totalQuoteLeads.count ?? 0)
  const totalConvertidos = (convertidosContact.count ?? 0) + (convertidosQuoteLead.count ?? 0)
  const leadsSinConvertir = Math.max(0, totalLeads - totalConvertidos)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-foreground text-2xl font-semibold">
          {dashboardCopy.resumenTitulo}
        </h1>
        <p className="text-muted mt-1 text-sm">Inventario operativo de la fábrica — agosto 2026</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          titulo={dashboardCopy.clientesActivos}
          valor={clientesActivos.count ?? 0}
          icono={<Briefcase className="h-5 w-5" />}
          href="/clientes"
        />
        <KpiCard
          titulo={dashboardCopy.proyectosEnDesarrollo}
          valor={proyectosDesarrollo.count ?? 0}
          icono={<FolderKanban className="h-5 w-5" />}
          href="/proyectos"
          colorClass="text-secondary"
        />
        <KpiCard
          titulo={dashboardCopy.proyectosEnProduccion}
          valor={proyectosProduccion.count ?? 0}
          icono={<FolderKanban className="h-5 w-5" />}
          href="/proyectos"
          colorClass="text-success"
        />
        <KpiCard
          titulo={dashboardCopy.leadsSinConvertir}
          valor={leadsSinConvertir}
          icono={<Inbox className="h-5 w-5" />}
          href="/leads"
          colorClass="text-warning"
        />
      </div>

      {(soporteActivo.count ?? 0) > 0 ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <ShieldCheck className="text-success h-5 w-5" />
            <p className="text-foreground text-sm">
              <span className="text-success font-semibold">{soporteActivo.count}</span>{' '}
              {dashboardCopy.soporteActivo}
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
