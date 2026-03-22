"use client";

import { useState } from "react";

export interface RevenueChartProps {
  data: { day: string; total: number }[];
  isLoading?: boolean;
  currencySymbol?: string;
}

export function RevenueChart({
  data,
  isLoading,
  currencySymbol = "$",
}: RevenueChartProps) {
  const [hover, setHover] = useState<{
    idx: number;
    x: number;
    y: number;
  } | null>(null);
  const max = Math.max(1, ...data.map((d) => d.total));

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
        <div className="h-5 w-40 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse mb-4" />
        <div className="h-40 flex items-end gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 flex flex-col justify-end h-full min-h-0"
            >
              <div
                className="w-full rounded-t-md bg-zinc-100 dark:bg-zinc-800 animate-pulse"
                style={{ height: `${20 + (i % 4) * 15}%` }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm relative">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
        Ingresos últimos 7 días
      </h2>
      <div className="h-40 flex gap-1.5 sm:gap-2">
        {data.map((d, idx) => {
          const pct = max > 0 ? (d.total / max) * 100 : 0;
          const barPct = Math.max(pct, d.total > 0 ? 6 : 0);
          return (
            <div
              key={`${d.day}-${idx}`}
              className="flex-1 flex flex-col justify-end min-h-0 h-40"
            >
              <div
                className="w-full flex flex-col justify-end flex-1 min-h-0 relative"
                onMouseEnter={(e) =>
                  setHover({ idx, x: e.clientX, y: e.clientY })
                }
                onMouseMove={(e) =>
                  setHover({ idx, x: e.clientX, y: e.clientY })
                }
                onMouseLeave={() => setHover(null)}
              >
                {hover?.idx === idx && (
                  <div
                    className="fixed z-50 px-2 py-1 rounded-md text-xs font-medium bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-lg pointer-events-none"
                    style={{
                      left: hover.x,
                      top: hover.y - 36,
                      transform: "translateX(-50%)",
                    }}
                  >
                    {d.day}: {currencySymbol}{" "}
                    {d.total.toLocaleString("es-VE", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                )}
                <div
                  className="w-full bg-violet-500/80 dark:bg-violet-400/80 rounded-t-md transition-colors hover:bg-violet-500 dark:hover:bg-violet-400"
                  style={{ height: `${barPct}%` }}
                />
              </div>
              <span className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-2 text-center truncate block max-w-full">
                {d.day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
