import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ProyectoForm } from '@/components/proyectos/ProyectoForm'
import { createClient } from '@/lib/supabase/server'
import { proyectosCopy, shellCopy } from '@/lib/content'
import type { HubClient } from '@zmtech/hub-schema'

export default async function NuevoProyectoPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>
}) {
  const { clientId } = await searchParams
  const supabase = await createClient()

  const { data: clientes } = await supabase.from('hub_clients').select('id, name').order('name')

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href="/proyectos"
        className="text-muted hover:text-foreground inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        {shellCopy.volver}
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{proyectosCopy.nuevo}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProyectoForm
            clientes={(clientes ?? []) as Pick<HubClient, 'id' | 'name'>[]}
            defaultClientId={clientId}
          />
        </CardContent>
      </Card>
    </div>
  )
}
