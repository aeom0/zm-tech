"use client";

import { formatCurrency } from "@/lib/format";
import type { TopServicioRow } from "../useDashboardData";

export interface TopServicesTableProps {
  rows: TopServicioRow[];
  isLoading?: boolean;
  currencySymbol?: string;
}

export function TopServicesTable({
  rows,
  isLoading,
  currencySymbol = "$",
}: TopServicesTableProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Top servicios del mes
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          Por cantidad de citas
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800">
              <th className="text-left px-5 py-3 font-semibold text-zinc-500 dark:text-zinc-400">
                Servicio
              </th>
              <th className="text-right px-5 py-3 font-semibold text-zinc-500 dark:text-zinc-400">
                Citas
              </th>
              <th className="text-right px-5 py-3 font-semibold text-zinc-500 dark:text-zinc-400">
                Ingresos
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr
                  key={i}
                  className="border-b border-zinc-50 dark:border-zinc-800/50 last:border-0"
                >
                  <td className="px-5 py-3">
                    <div className="h-4 w-32 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="h-4 w-8 ml-auto rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="h-4 w-20 ml-auto rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-5 py-10 text-center text-zinc-500 dark:text-zinc-400 text-sm"
                >
                  No hay citas con servicio vinculado este mes
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr
                  key={`${row.name}-${idx}`}
                  className="border-b border-zinc-50 dark:border-zinc-800/50 last:border-0 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                >
                  <td className="px-5 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                    {row.name}
                  </td>
                  <td className="px-5 py-3 text-right text-zinc-700 dark:text-zinc-300">
                    {row.count}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(row.revenue, currencySymbol)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
