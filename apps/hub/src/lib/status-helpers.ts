import type { HubClientStatus, HubProjectStatus } from "@zmtech/hub-schema";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "muted" | "accent";

export function variantClienteStatus(status: HubClientStatus): BadgeVariant {
  const map: Record<HubClientStatus, BadgeVariant> = {
    lead: "warning",
    activo: "success",
    pausado: "muted",
    cerrado: "danger",
  };
  return map[status];
}

export function variantProyectoStatus(status: HubProjectStatus): BadgeVariant {
  const map: Record<HubProjectStatus, BadgeVariant> = {
    propuesta: "warning",
    desarrollo: "accent",
    produccion: "success",
    pausado: "muted",
    archivado: "danger",
  };
  return map[status];
}

export function fmtUsd(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

export function fmtFecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso + "T12:00:00Z").toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
