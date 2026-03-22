"use client";

function saludoPorHora(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

export interface DashboardHeaderProps {
  tenantName: string | null;
  userDisplayName: string | null;
  isLoading?: boolean;
}

export function DashboardHeader({
  tenantName,
  userDisplayName,
  isLoading,
}: DashboardHeaderProps) {
  const nombre =
    userDisplayName?.trim().split(/\s+/)[0] ?? "equipo";
  const negocio = tenantName?.trim() || "tu negocio";

  return (
    <div className="space-y-1">
      {isLoading ? (
        <>
          <div className="h-8 w-64 max-w-full rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          <div className="h-4 w-48 max-w-full rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {saludoPorHora()}, {nombre}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            Resumen de <span className="font-medium text-zinc-700 dark:text-zinc-300">{negocio}</span>
          </p>
        </>
      )}
    </div>
  );
}
