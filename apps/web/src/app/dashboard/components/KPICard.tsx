"use client";

import type { ReactNode } from "react";

export interface KPICardProps {
  label: string;
  value: string | number;
  subvalue?: string;
  icon: ReactNode;
  accentColor?: string;
  isLoading?: boolean;
}

export function KPICard({
  label,
  value,
  subvalue,
  icon,
  accentColor = "text-zinc-500",
  isLoading,
}: KPICardProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div
          className={`w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center ${accentColor}`}
        >
          {icon}
        </div>
        <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
          {label}
        </span>
      </div>
      {isLoading ? (
        <div className="h-8 w-28 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
      ) : (
        <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {value}
        </p>
      )}
      {subvalue && !isLoading && (
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
          {subvalue}
        </p>
      )}
    </div>
  );
}
