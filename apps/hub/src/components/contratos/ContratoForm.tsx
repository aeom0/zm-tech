"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { contratoCopy, shellCopy } from "@/lib/content";
import { crearContrato, actualizarContrato } from "@/lib/actions/contratos";
import type { ContratoFormValues } from "@/lib/validation/contratos";
import type { HubContract, HubProject } from "@zmtech/hub-schema";

interface ContratoFormProps {
  clientId: string;
  contrato?: HubContract;
  proyectos?: Pick<HubProject, "id" | "name">[];
  onDone: () => void;
}

const modelosPago = [
  { value: "50/50", label: "50/50" },
  { value: "100% adelanto", label: "100% adelanto" },
  { value: "mensual", label: "Mensual" },
  { value: "proyecto", label: "Por proyecto" },
];

export function ContratoForm({
  clientId,
  contrato,
  proyectos = [],
  onDone,
}: ContratoFormProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [values, setValues] = useState<ContratoFormValues>({
    clientId,
    projectId: contrato?.projectId ?? null,
    amountUsd: contrato?.amountUsd ? parseFloat(contrato.amountUsd) : null,
    paymentModel: contrato?.paymentModel ?? "50/50",
    monthlySupportUsd: contrato?.monthlySupportUsd
      ? parseFloat(contrato.monthlySupportUsd)
      : null,
    supportActive: contrato?.supportActive ?? false,
    startDate: contrato?.startDate ?? null,
    deliveredAt: contrato?.deliveredAt ?? null,
    notes: contrato?.notes ?? "",
  });

  function set<K extends keyof ContratoFormValues>(key: K, value: ContratoFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = contrato
        ? await actualizarContrato(contrato.id, clientId, values)
        : await crearContrato(values);

      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDone();
    });
  }

  const proyectoOptions = [
    { value: "", label: "Sin proyecto" },
    ...proyectos.map((p) => ({ value: p.id, label: p.name })),
  ];

  return (
    <div className="space-y-4">
      {proyectos.length > 0 ? (
        <Select
          label="Proyecto"
          options={proyectoOptions}
          value={values.projectId ?? ""}
          onChange={(e) => set("projectId", e.target.value || null)}
        />
      ) : null}

      <div className="grid gap-4 grid-cols-2">
        <Input
          label={contratoCopy.montoLabel}
          type="number"
          min="0"
          step="0.01"
          value={values.amountUsd?.toString() ?? ""}
          onChange={(e) =>
            set("amountUsd", e.target.value ? parseFloat(e.target.value) : null)
          }
        />
        <Select
          label={contratoCopy.modeloPagoLabel}
          options={modelosPago}
          value={values.paymentModel}
          onChange={(e) => set("paymentModel", e.target.value)}
        />
      </div>

      <div className="grid gap-4 grid-cols-2">
        <Input
          label={contratoCopy.soporteMensualLabel}
          type="number"
          min="0"
          step="0.01"
          value={values.monthlySupportUsd?.toString() ?? ""}
          onChange={(e) =>
            set("monthlySupportUsd", e.target.value ? parseFloat(e.target.value) : null)
          }
        />
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">{contratoCopy.soporteActivoLabel}</span>
          <label className="flex items-center gap-2 cursor-pointer mt-2">
            <input
              type="checkbox"
              checked={values.supportActive}
              onChange={(e) => set("supportActive", e.target.checked)}
              className="h-4 w-4 rounded accent-[--accent]"
            />
            <span className="text-sm text-foreground">Activo</span>
          </label>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2">
        <Input
          label={contratoCopy.fechaInicioLabel}
          type="date"
          value={values.startDate ?? ""}
          onChange={(e) => set("startDate", e.target.value || null)}
        />
        <Input
          label={contratoCopy.fechaEntregaLabel}
          type="date"
          value={values.deliveredAt ?? ""}
          onChange={(e) => set("deliveredAt", e.target.value || null)}
        />
      </div>

      <Textarea
        label={contratoCopy.notasLabel}
        value={values.notes ?? ""}
        onChange={(e) => set("notes", e.target.value)}
      />

      {error ? (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onDone}>
          {shellCopy.cancelar}
        </Button>
        <Button variant="primary" loading={pending} onClick={handleSubmit}>
          {shellCopy.guardar}
        </Button>
      </div>
    </div>
  );
}
