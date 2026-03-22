"use client";

import { formatCurrency } from "@/lib/format";

export interface AppointmentStatusRowProps {
  clientName: string;
  date: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | string;
  price: number;
  currencySymbol?: string;
}

function formatearFechaCita(iso: string): string {
  const d = new Date(iso);
  const hoy = new Date();
  const mismoDia =
    d.getDate() === hoy.getDate() &&
    d.getMonth() === hoy.getMonth() &&
    d.getFullYear() === hoy.getFullYear();
  const hora = d.toLocaleString("es-VE", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  if (mismoDia) {
    return `hoy ${hora}`;
  }
  const fecha = d.toLocaleString("es-VE", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return fecha;
}

const BADGE: Record<string, { label: string; className: string }> = {
  scheduled: {
    label: "Agendada",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  },
  confirmed: {
    label: "Confirmada",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  completed: {
    label: "Completada",
    className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  },
  cancelled: {
    label: "Cancelada",
    className: "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400",
  },
};

export function AppointmentStatusRow({
  clientName,
  date,
  status,
  price,
  currencySymbol = "$",
}: AppointmentStatusRowProps) {
  const badge = BADGE[status] ?? {
    label: status,
    className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  };

  return (
    <div className="flex items-start justify-between gap-3 py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
          {clientName}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          {formatearFechaCita(date)}
        </p>
        <span
          className={`inline-flex mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>
      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
        {formatCurrency(price, currencySymbol)}
      </div>
    </div>
  );
}
