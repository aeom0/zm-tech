"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  HUB_PROJECT_TYPES,
  HUB_PROJECT_STATUSES,
  HUB_PROJECT_TYPE_LABELS,
  HUB_PROJECT_STATUS_LABELS,
} from "@zmtech/hub-schema";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { proyectosCopy, shellCopy } from "@/lib/content";
import { crearProyecto, actualizarProyecto } from "@/lib/actions/proyectos";
import type { ProyectoFormValues } from "@/lib/validation/proyectos";
import type { HubProject, HubClient } from "@zmtech/hub-schema";

interface ProyectoFormProps {
  proyecto?: HubProject;
  clientes?: Pick<HubClient, "id" | "name">[];
  defaultClientId?: string;
  onSuccess?: (id: string) => void;
}

const tipoOptions = HUB_PROJECT_TYPES.map((t) => ({
  value: t,
  label: HUB_PROJECT_TYPE_LABELS[t],
}));

const estadoOptions = HUB_PROJECT_STATUSES.map((s) => ({
  value: s,
  label: HUB_PROJECT_STATUS_LABELS[s],
}));

export function ProyectoForm({
  proyecto,
  clientes = [],
  defaultClientId,
  onSuccess,
}: ProyectoFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [values, setValues] = useState<ProyectoFormValues>({
    clientId: proyecto?.clientId ?? defaultClientId ?? null,
    name: proyecto?.name ?? "",
    slug: proyecto?.slug ?? "",
    type: proyecto?.type ?? "web",
    status: proyecto?.status ?? "desarrollo",
    repoUrl: proyecto?.repoUrl ?? "",
    stack: proyecto?.stack?.join(", ") ?? "",
    productionUrl: proyecto?.productionUrl ?? "",
    vercelProject: proyecto?.vercelProject ?? "",
    easProject: proyecto?.easProject ?? "",
    supabaseRef: proyecto?.supabaseRef ?? "",
    version: proyecto?.version ?? "",
    notes: proyecto?.notes ?? "",
  });

  function set<K extends keyof ProyectoFormValues>(key: K, value: ProyectoFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = proyecto
        ? await actualizarProyecto(proyecto.id, values)
        : await crearProyecto(values);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      const id =
        proyecto?.id ??
        (result as { ok: true; data: { id: string } }).data.id;
      if (onSuccess) {
        onSuccess(id);
      } else {
        router.push(`/proyectos/${id}`);
      }
    });
  }

  const clienteOptions = [
    { value: "", label: proyectosCopy.sinCliente },
    ...clientes.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={proyectosCopy.nombreLabel}
          required
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
        />
        <Input
          label={proyectosCopy.slugLabel}
          required
          value={values.slug}
          onChange={(e) =>
            set(
              "slug",
              e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
            )
          }
          hint="ej: guataparobr, yla-mvp"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Select
          label={proyectosCopy.tipoLabel}
          options={tipoOptions}
          value={values.type}
          onChange={(e) => set("type", e.target.value as ProyectoFormValues["type"])}
        />
        <Select
          label={proyectosCopy.estadoLabel}
          options={estadoOptions}
          value={values.status}
          onChange={(e) => set("status", e.target.value as ProyectoFormValues["status"])}
        />
        {clientes.length > 0 ? (
          <Select
            label={proyectosCopy.clienteLabel}
            options={clienteOptions}
            value={values.clientId ?? ""}
            onChange={(e) => set("clientId", e.target.value || null)}
          />
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={proyectosCopy.repoLabel}
          type="url"
          value={values.repoUrl ?? ""}
          onChange={(e) => set("repoUrl", e.target.value)}
          placeholder="https://github.com/aeom0/..."
        />
        <Input
          label={proyectosCopy.produccionUrlLabel}
          type="url"
          value={values.productionUrl ?? ""}
          onChange={(e) => set("productionUrl", e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={proyectosCopy.vercelLabel}
          value={values.vercelProject ?? ""}
          onChange={(e) => set("vercelProject", e.target.value)}
        />
        <Input
          label={proyectosCopy.supabaseRefLabel}
          value={values.supabaseRef ?? ""}
          onChange={(e) => set("supabaseRef", e.target.value)}
          placeholder="ej: udelxwwnyivknslueerr"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={proyectosCopy.stackLabel}
          value={values.stack ?? ""}
          onChange={(e) => set("stack", e.target.value)}
          placeholder="Next.js, Supabase, Expo, ..."
        />
        <Input
          label={proyectosCopy.versionLabel}
          value={values.version ?? ""}
          onChange={(e) => set("version", e.target.value)}
          placeholder="ej: 2.23.1"
        />
      </div>

      <Textarea
        label={proyectosCopy.notasLabel}
        value={values.notes ?? ""}
        onChange={(e) => set("notes", e.target.value)}
      />

      {error ? (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">
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
  );
}
