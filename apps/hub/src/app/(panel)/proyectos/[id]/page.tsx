import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Github } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  HUB_PROJECT_STATUS_LABELS,
  HUB_PROJECT_TYPE_LABELS,
} from "@zmtech/hub-schema";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { ProyectoEditForm } from "@/components/proyectos/ProyectoEditForm";
import { shellCopy } from "@/lib/content";
import { variantProyectoStatus } from "@/lib/status-helpers";
import type { HubProject, HubClient } from "@zmtech/hub-schema";

export default async function ProyectoFichaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [proyectoRes, clientesRes] = await Promise.all([
    supabase
      .from("hub_projects")
      .select("*, hub_clients(id, name)")
      .eq("id", id)
      .single(),
    supabase.from("hub_clients").select("id, name").order("name"),
  ]);

  if (proyectoRes.error || !proyectoRes.data) return notFound();

  const proyecto = proyectoRes.data as HubProject & {
    hub_clients?: Pick<HubClient, "id" | "name"> | null;
  };
  const clientes = (clientesRes.data ?? []) as Pick<HubClient, "id" | "name">[];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        href="/proyectos"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {shellCopy.volver}
      </Link>

      {/* Cabecera */}
      <Card>
        <CardHeader>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-semibold text-foreground">
              {proyecto.name}
            </h1>
            {proyecto.hub_clients ? (
              <Link
                href={`/clientes/${proyecto.hub_clients.id}`}
                className="text-sm text-accent hover:underline"
              >
                {proyecto.hub_clients.name}
              </Link>
            ) : (
              <p className="text-sm text-muted">Producto propio ZM Tech</p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Badge variant={variantProyectoStatus(proyecto.status)}>
              {HUB_PROJECT_STATUS_LABELS[proyecto.status]}
            </Badge>
            <Badge variant="muted">
              {HUB_PROJECT_TYPE_LABELS[proyecto.type]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <dt className="text-muted">Slug</dt>
            <dd className="font-mono text-foreground">{proyecto.slug}</dd>

            {proyecto.version ? (
              <>
                <dt className="text-muted">Versión</dt>
                <dd className="text-foreground">v{proyecto.version}</dd>
              </>
            ) : null}

            {proyecto.supabaseRef ? (
              <>
                <dt className="text-muted">Supabase ref</dt>
                <dd className="font-mono text-foreground text-xs">
                  {proyecto.supabaseRef}
                </dd>
              </>
            ) : null}

            {proyecto.vercelProject ? (
              <>
                <dt className="text-muted">Vercel project</dt>
                <dd className="text-foreground">{proyecto.vercelProject}</dd>
              </>
            ) : null}

            {proyecto.easProject ? (
              <>
                <dt className="text-muted">EAS project</dt>
                <dd className="text-foreground">{proyecto.easProject}</dd>
              </>
            ) : null}

            {proyecto.stack && proyecto.stack.length > 0 ? (
              <>
                <dt className="text-muted">Stack</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {proyecto.stack.map((s) => (
                    <Badge key={s} variant="muted">
                      {s}
                    </Badge>
                  ))}
                </dd>
              </>
            ) : null}

            {proyecto.notes ? (
              <>
                <dt className="text-muted">Notas</dt>
                <dd className="text-foreground whitespace-pre-wrap">{proyecto.notes}</dd>
              </>
            ) : null}
          </dl>

          {/* Links */}
          {(proyecto.repoUrl || proyecto.productionUrl) ? (
            <div className="mt-4 flex gap-3">
              {proyecto.repoUrl ? (
                <a
                  href={proyecto.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition hover:text-foreground"
                >
                  <Github className="h-3.5 w-3.5" />
                  Repositorio
                </a>
              ) : null}
              {proyecto.productionUrl ? (
                <a
                  href={proyecto.productionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition hover:text-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Producción
                </a>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Editar proyecto */}
      <ProyectoEditForm proyecto={proyecto} clientes={clientes} />
    </div>
  );
}
