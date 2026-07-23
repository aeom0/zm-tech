"use client";

import { CalendarRange } from "lucide-react";

import type { AppointmentsByStatus } from "@/hooks/dashboard/useDashboardAppointments";

import { MetricSkeleton } from "./MetricSkeleton";

const STATUS_META: {
  key: keyof Pick<
    AppointmentsByStatus,
    "completed" | "confirmed" | "scheduled" | "cancelled"
  >;
  label: string;
  color: string;
}[] = [
  { key: "completed", label: "Completadas", color: "#22c55e" },
  { key: "confirmed", label: "Confirmadas", color: "#3b82f6" },
  { key: "scheduled", label: "Agendadas", color: "#eab308" },
  { key: "cancelled", label: "Canceladas", color: "#ef4444" },
];

interface AppointmentsStatusCardProps {
  data: AppointmentsByStatus | undefined;
  isLoading: boolean;
}

export function AppointmentsStatusCard({
  data,
  isLoading,
}: AppointmentsStatusCardProps) {
  if (isLoading) {
    return <MetricSkeleton variant="card" />;
  }

  const grouped = data ?? {
    completed: 0,
    cancelled: 0,
    scheduled: 0,
    confirmed: 0,
    other: 0,
    total: 0,
  };

  const totalMain =
    STATUS_META.reduce((s, m) => s + grouped[m.key], 0) + grouped.other;

  return (
    <div className="rounded-xl border border-white/10 bg-[#1A1A1A] p-5 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-white/60">
        <CalendarRange className="w-4 h-4 text-sky-400" />
        Citas por estado
      </div>
      <p className="text-xs text-white/45">
        Total en el período:{" "}
        <span className="text-white/90 font-semibold tabular-nums">
          {totalMain}
        </span>
      </p>
      <div className="space-y-3">
        {STATUS_META.map(({ key, label, color }) => {
          const n = grouped[key];
          const pct = totalMain > 0 ? Math.round((n / totalMain) * 100) : 0;
          return (
            <div key={key}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/70">{label}</span>
                <span className="text-white/90 tabular-nums">
                  {n} ({pct}%)
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.07] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          );
        })}
        {grouped.other > 0 ? (
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/70">Otras</span>
              <span className="text-white/90 tabular-nums">
                {grouped.other}
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.07] overflow-hidden">
              <div
                className="h-full rounded-full bg-white/30 transition-all"
                style={{
                  width: `${totalMain > 0 ? Math.round((grouped.other / totalMain) * 100) : 0}%`,
                }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
