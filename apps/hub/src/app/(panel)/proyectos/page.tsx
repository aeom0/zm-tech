import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  HUB_PROJECT_STATUS_LABELS,
  HUB_PROJECT_TYPE_LABELS,
} from "@zmtech/hub-schema";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { proyectosCopy } from "@/lib/content";
import { variantProyectoStatus } from "@/lib/status-helpers";
import type { HubProject } from "@zmtech/hub-schema";

interface ProyectoConCliente extends HubProject {
  hub_clients?: { name: string } | null;
}

export default async function ProyectosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; tipo?: string }>;
}) {
  const { estado, tipo } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("hub_projects")
    .select("*, hub_clients(name)")
    .order("created_at", { ascending: false });

  if (estado) query = query.eq("status", estado);
  if (tipo) query = query.eq("type", tipo);

  const { data: proyectos, error } = await query;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            {proyectosCopy.titulo}
          </h1>
          <p className="mt-0.5 text-sm text-muted">{proyectosCopy.subtitulo}</p>
        </div>
        <Link
          href="/proyectos/nuevo"
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" />
          {proyectosCopy.nuevo}
        </Link>
      </div>

      <FiltrosProyectos estado={estado} tipo={tipo} />

      {error ? (
        <p className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          {error.message}
        </p>
      ) : null}

      {!proyectos || proyectos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted">
            {proyectosCopy.sinProyectos}
          </CardContent>
        </Card>
      ) : (
        <ProyectosGrid proyectos={proyectos as ProyectoConCliente[]} />
      )}
    </div>
  );
}

function FiltrosProyectos({
  estado,
  tipo,
}: {
  estado?: string;
  tipo?: string;
}) {
  const estadoOpts = [
    "propuesta",
    "desarrollo",
    "produccion",
    "pausado",
    "archivado",
  ] as const;
  const tipoOpts = ["web", "mobile", "fullstack", "bot", "otro"] as const;

  return (
    <form method="GET" className="flex flex-wrap gap-3">
      <select
        name="estado"
        defaultValue={estado ?? ""}
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent/60 focus:outline-none"
      >
        <option value="">Estado: todos</option>
        {estadoOpts.map((e) => (
          <option key={e} value={e}>
            {HUB_PROJECT_STATUS_LABELS[e]}
          </option>
        ))}
      </select>
      <select
        name="tipo"
        defaultValue={tipo ?? ""}
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent/60 focus:outline-none"
      >
        <option value="">Tipo: todos</option>
        {tipoOpts.map((t) => (
          <option key={t} value={t}>
            {HUB_PROJECT_TYPE_LABELS[t]}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-lg border border-border bg-surface px-4 py-2 text-sm text-muted transition hover:text-foreground"
      >
        Filtrar
      </button>
      {(estado || tipo) ? (
        <Link
          href="/proyectos"
          className="rounded-lg border border-border bg-surface px-4 py-2 text-sm text-muted transition hover:text-foreground"
        >
          Limpiar
        </Link>
      ) : null}
    </form>
  );
}

function ProyectosGrid({ proyectos }: { proyectos: ProyectoConCliente[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {proyectos.map((p) => (
        <Link key={p.id} href={`/proyectos/${p.id}`}>
          <Card className="h-full cursor-pointer transition-colors hover:border-accent/30">
            <CardHeader className="pb-2">
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{p.name}</p>
                {p.hub_clients?.name ? (
                  <p className="truncate text-xs text-muted">{p.hub_clients.name}</p>
                ) : (
                  <p className="text-xs text-muted/60">Producto propio</p>
                )}
              </div>
              <Badge variant={variantProyectoStatus(p.status)}>
                {HUB_PROJECT_STATUS_LABELS[p.status]}
              </Badge>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                <Badge variant="muted">{HUB_PROJECT_TYPE_LABELS[p.type]}</Badge>
                {p.version ? (
                  <span className="text-xs text-muted">v{p.version}</span>
                ) : null}
              </div>
              {p.stack && p.stack.length > 0 ? (
                <p className="mt-2 truncate text-xs text-muted">
                  {p.stack.slice(0, 4).join(" · ")}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
