import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Github, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  HUB_CLIENT_STATUS_LABELS,
  HUB_VERTICAL_LABELS,
  HUB_CLIENT_SOURCE_LABELS,
  HUB_PROJECT_STATUS_LABELS,
  HUB_PROJECT_TYPE_LABELS,
} from "@zmtech/hub-schema";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ContratosSección } from "@/components/contratos/ContratosSección";
import { ClienteEditForm } from "@/components/clientes/ClienteEditForm";
import { clientesCopy, shellCopy } from "@/lib/content";
import { variantClienteStatus, variantProyectoStatus } from "@/lib/status-helpers";
import type { HubClient, HubProject, HubContract } from "@zmtech/hub-schema";

export default async function ClienteFichaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [clienteRes, proyectosRes, contratosRes] = await Promise.all([
    supabase.from("hub_clients").select("*").eq("id", id).single(),
    supabase
      .from("hub_projects")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("hub_contracts")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (clienteRes.error || !clienteRes.data) return notFound();

  const cliente = clienteRes.data as HubClient;
  const proyectos = (proyectosRes.data ?? []) as HubProject[];
  const contratos = (contratosRes.data ?? []) as HubContract[];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/clientes"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {shellCopy.volver}
        </Link>
      </div>

      {/* Cabecera */}
      <Card>
        <CardHeader>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-semibold text-foreground">
              {cliente.name}
            </h1>
            {cliente.contactName ? (
              <p className="text-sm text-muted">{cliente.contactName}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Badge variant={variantClienteStatus(cliente.status)}>
              {HUB_CLIENT_STATUS_LABELS[cliente.status]}
            </Badge>
            <Badge variant="muted">{HUB_VERTICAL_LABELS[cliente.vertical]}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {cliente.email ? (
              <>
                <dt className="text-muted">{clientesCopy.emailLabel}</dt>
                <dd className="text-foreground">{cliente.email}</dd>
              </>
            ) : null}
            {cliente.phone ? (
              <>
                <dt className="text-muted">{clientesCopy.telefonoLabel}</dt>
                <dd className="text-foreground">{cliente.phone}</dd>
              </>
            ) : null}
            {cliente.whatsapp ? (
              <>
                <dt className="text-muted">{clientesCopy.whatsappLabel}</dt>
                <dd className="text-foreground">{cliente.whatsapp}</dd>
              </>
            ) : null}
            {(cliente.city ?? cliente.country) ? (
              <>
                <dt className="text-muted">{clientesCopy.ciudadLabel}</dt>
                <dd className="text-foreground">
                  {[cliente.city, cliente.country].filter(Boolean).join(", ")}
                </dd>
              </>
            ) : null}
            <dt className="text-muted">{clientesCopy.origenLabel}</dt>
            <dd className="text-foreground">
              {HUB_CLIENT_SOURCE_LABELS[cliente.source]}
              {(cliente.sourceContactId || cliente.sourceQuoteLeadId) ? (
                <span className="ml-2 text-xs text-accent">
                  {clientesCopy.fichaOrigenRef}
                </span>
              ) : null}
            </dd>
            {cliente.notes ? (
              <>
                <dt className="text-muted">{clientesCopy.notasLabel}</dt>
                <dd className="text-foreground whitespace-pre-wrap">{cliente.notes}</dd>
              </>
            ) : null}
          </dl>
        </CardContent>
      </Card>

      {/* Editar cliente */}
      <ClienteEditForm cliente={cliente} />

      {/* Proyectos */}
      <Card>
        <CardHeader>
          <CardTitle>{clientesCopy.fichaProyectos}</CardTitle>
          <Link
            href={`/proyectos/nuevo?clientId=${id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
            Nuevo proyecto
          </Link>
        </CardHeader>
        <CardContent>
          {proyectos.length === 0 ? (
            <p className="text-sm text-muted">{clientesCopy.sinProyectos}</p>
          ) : (
            <div className="space-y-3">
              {proyectos.map((p) => (
                <Link
                  key={p.id}
                  href={`/proyectos/${p.id}`}
                  className="flex items-start justify-between rounded-lg border border-border bg-surface-elevated p-3 transition hover:border-accent/30"
                >
                  <div>
                    <p className="font-medium text-foreground">{p.name}</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Badge variant={variantProyectoStatus(p.status)}>
                        {HUB_PROJECT_STATUS_LABELS[p.status]}
                      </Badge>
                      <Badge variant="muted">{HUB_PROJECT_TYPE_LABELS[p.type]}</Badge>
                      {p.version ? (
                        <span className="text-xs text-muted">v{p.version}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {p.repoUrl ? (
                      <a
                        href={p.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted hover:text-foreground"
                      >
                        <Github className="h-4 w-4" />
                      </a>
                    ) : null}
                    {p.productionUrl ? (
                      <a
                        href={p.productionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted hover:text-foreground"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contratos */}
      <ContratosSección
        clientId={id}
        contratos={contratos}
        proyectos={proyectos.map((p) => ({ id: p.id, name: p.name }))}
      />
    </div>
  );
}
