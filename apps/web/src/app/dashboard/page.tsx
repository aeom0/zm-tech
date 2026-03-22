"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  LogOut,
  User,
  LayoutDashboard,
  DollarSign,
  Calendar,
  TrendingUp,
  UserX,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/format";
import { useDashboardData } from "./useDashboardData";
import { DashboardHeader } from "./components/DashboardHeader";
import { KPICard } from "./components/KPICard";
import { RevenueChart } from "./components/RevenueChart";
import { AppointmentStatusRow } from "./components/AppointmentStatusRow";
import { TopServicesTable } from "./components/TopServicesTable";

export default function DashboardPage() {
  const router = useRouter();
  const {
    isAuthenticated,
    isLoading: authLoading,
    isAdmin,
    profile,
    logout,
  } = useAuth();
  const data = useDashboardData();

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace("/finanzas/login");
      return;
    }
    // Staff: no mostrar UI de “acceso denegado” (no revelar que la ruta existe) → landing.
    if (!isAdmin) router.replace("/");
  }, [isAuthenticated, isAdmin, authLoading, router]);

  const handleLogout = async () => {
    await logout();
    router.replace("/finanzas/login");
    router.refresh();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500 dark:text-zinc-400 text-sm">
          Cargando…
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500 dark:text-zinc-400 text-sm">
          Cargando…
        </div>
      </div>
    );
  }

  const { currencySymbol } = data;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-[var(--primary)] transition-colors text-sm font-medium shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              Inicio
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 min-w-0">
              <LayoutDashboard className="w-4 h-4 text-[var(--primary)] shrink-0" />
              <span className="truncate">Dashboard</span>
            </span>
            <Link
              href="/finanzas"
              className="hidden sm:inline-flex text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors shrink-0"
            >
              Finanzas
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {profile?.full_name && (
              <span className="hidden sm:flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                <User className="w-4 h-4" />
                {profile.full_name}
              </span>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <DashboardHeader
          tenantName={data.tenantBusinessName}
          userDisplayName={profile?.full_name ?? null}
          isLoading={data.isLoading}
        />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KPICard
            label="Ingresos hoy"
            value={formatCurrency(data.ingresoHoy, currencySymbol)}
            icon={<DollarSign className="w-4 h-4" />}
            accentColor="text-emerald-500"
            isLoading={data.isLoading}
          />
          <KPICard
            label="Citas hoy"
            value={data.citasHoy}
            subvalue={
              data.isLoading
                ? undefined
                : `${data.citasCompletadasHoy} completadas`
            }
            icon={<Calendar className="w-4 h-4" />}
            accentColor="text-blue-500"
            isLoading={data.isLoading}
          />
          <KPICard
            label="Ingresos del mes"
            value={formatCurrency(data.ingresoMes, currencySymbol)}
            icon={<TrendingUp className="w-4 h-4" />}
            accentColor="text-violet-500"
            isLoading={data.isLoading}
          />
          <KPICard
            label="Sin asignar"
            value={data.citasSinAsignar}
            subvalue={
              data.isLoading ? undefined : `${data.citasMes} citas en el mes`
            }
            icon={<UserX className="w-4 h-4" />}
            accentColor="text-amber-500"
            isLoading={data.isLoading}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RevenueChart
              data={data.revenueByDay}
              isLoading={data.isLoading}
              currencySymbol={currencySymbol}
            />
          </div>
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              Próximas citas (hoy)
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
              Pendientes y confirmadas
            </p>
            {data.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse"
                  />
                ))}
              </div>
            ) : data.proximasCitas.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 py-4 text-center">
                No hay más citas pendientes hoy. ¡Todo al día!
              </p>
            ) : (
              <div>
                {data.proximasCitas.map((c) => (
                  <AppointmentStatusRow
                    key={c.id}
                    clientName={c.client_name}
                    date={c.date}
                    status={c.status}
                    price={parseFloat(c.price)}
                    currencySymbol={currencySymbol}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <TopServicesTable
          rows={data.topServicios}
          isLoading={data.isLoading}
          currencySymbol={currencySymbol}
        />

        <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 pb-4">
          SalonPro · Panel de métricas
        </p>
      </main>
    </div>
  );
}
