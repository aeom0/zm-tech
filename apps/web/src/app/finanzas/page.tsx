"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Lock,
  ArrowLeft,
  LogOut,
  User,
  DollarSign,
  Clock,
  AlertCircle,
  Smartphone,
  CreditCard,
  Banknote,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFinanzasData } from "./useFinanzasData";

const METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  yape: "Yape",
  plin: "Plin",
  transfer: "Transferencia",
};

function MethodIcon({ method }: { method: string }) {
  if (method === "card") return <CreditCard className="w-3.5 h-3.5" />;
  if (method === "yape" || method === "plin" || method === "transfer")
    return <Smartphone className="w-3.5 h-3.5" />;
  return <Banknote className="w-3.5 h-3.5" />;
}

function fmtS(n: number) {
  return `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString("es-PE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FinanzasPage() {
  const router = useRouter();
  const {
    isAuthenticated,
    isLoading: authLoading,
    isAdmin,
    profile,
    logout,
  } = useAuth();
  const finanzas = useFinanzasData();

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) router.replace("/finanzas/login");
  }, [isAuthenticated, authLoading, router]);

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
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-[var(--primary)] transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al inicio
            </Link>
          </div>
        </header>
        <main className="max-w-md mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-6">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Solo administración
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2 text-sm">
            Este panel es solo para Vanessa y administradores. Tus ganancias las
            ves en la app móvil en Más → Finanzas.
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-8 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </main>
      </div>
    );
  }

  const {
    payments,
    totalMes,
    totalAbonos,
    pendienteMes,
    citasConPendiente,
    desgloseChicas,
    isLoading,
  } = finanzas;

  const mesActual = new Date().toLocaleString("es-PE", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-[var(--primary)] transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Inicio
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[var(--primary)]" />
              Finanzas
            </span>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors ml-1 pl-3 border-l border-zinc-200 dark:border-zinc-700"
            >
              Dashboard
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
        {/* Título mes */}
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 capitalize">
            {mesActual}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
            Panel de finanzas · ZM Lash &amp; Nails Beauty
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                Total cobrado
              </span>
            </div>
            {isLoading ? (
              <div className="h-8 w-24 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {fmtS(totalMes)}
              </p>
            )}
            {!isLoading && totalAbonos > 0 && (
              <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                <Smartphone className="w-3 h-3" />
                Adelantos: {fmtS(totalAbonos)}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                Pendiente mes
              </span>
            </div>
            {isLoading ? (
              <div className="h-8 w-24 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {fmtS(pendienteMes)}
              </p>
            )}
            {!isLoading && (
              <p className="text-xs text-zinc-400 mt-1">
                {citasConPendiente} citas con pago parcial
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-[var(--primary)]" />
              </div>
              <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                Transacciones
              </span>
            </div>
            {isLoading ? (
              <div className="h-8 w-16 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {payments.length}
              </p>
            )}
            <p className="text-xs text-zinc-400 mt-1">este mes</p>
          </div>
        </div>

        {/* Desglose por chica */}
        {!isLoading && desgloseChicas.length > 0 && (
          <section>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
              Por chica — {mesActual}
            </h2>
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800">
                    <th className="text-left px-4 py-3 font-semibold text-zinc-500 dark:text-zinc-400">
                      Chica
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-zinc-500 dark:text-zinc-400">
                      Generado
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-zinc-500 dark:text-zinc-400">
                      Cobrado
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-zinc-500 dark:text-zinc-400">
                      Pendiente
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {desgloseChicas.map((e) => (
                    <tr
                      key={e.id}
                      className="border-b border-zinc-50 dark:border-zinc-800/50 last:border-0"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: e.color }}
                          />
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">
                            {e.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300">
                        {fmtS(e.generado)}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                        {fmtS(e.pagado)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {e.pendiente > 0.01 ? (
                          <span className="font-semibold text-[var(--primary)]">
                            {fmtS(e.pendiente)}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Historial de pagos */}
        <section>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            Pagos — {mesActual}
          </h2>
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse"
                  />
                ))}
              </div>
            ) : payments.length === 0 ? (
              <div className="py-12 text-center">
                <DollarSign className="w-10 h-10 mx-auto mb-3 text-zinc-300 dark:text-zinc-700" />
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                  Sin pagos este mes
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-800">
                      <th className="text-left px-4 py-3 font-semibold text-zinc-500 dark:text-zinc-400">
                        Fecha
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-zinc-500 dark:text-zinc-400">
                        Cliente / Servicio
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-zinc-500 dark:text-zinc-400">
                        Chica
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-zinc-500 dark:text-zinc-400">
                        Método
                      </th>
                      <th className="text-right px-4 py-3 font-semibold text-zinc-500 dark:text-zinc-400">
                        Monto
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => {
                      const monto = parseFloat(p.amount);
                      const total = p.service_total
                        ? parseFloat(p.service_total)
                        : null;
                      return (
                        <tr
                          key={p.id}
                          className="border-b border-zinc-50 dark:border-zinc-800/50 last:border-0 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                        >
                          <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                            {fmtDate(p.date)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              {p.client_name && (
                                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                  {p.client_name}
                                </span>
                              )}
                              {p.service_name && (
                                <span className="text-zinc-400 text-xs">
                                  {p.service_name}
                                </span>
                              )}
                              {!p.client_name && !p.service_name && (
                                <span className="text-zinc-400 italic text-xs">
                                  Sin cita vinculada
                                </span>
                              )}
                              {p.is_abono && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                                  <Smartphone className="w-3 h-3" />
                                  Adelanto 20%
                                  {total && (
                                    <span className="opacity-70">
                                      {" "}
                                      / {fmtS(total)}
                                    </span>
                                  )}
                                </span>
                              )}
                              {p.notes && (
                                <span className="text-zinc-400 text-xs italic">
                                  {p.notes}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {p.employee_name ? (
                              <span className="inline-flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                                <span
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{
                                    backgroundColor:
                                      p.employee_color ?? "#7B2D8E",
                                  }}
                                />
                                {p.employee_name}
                              </span>
                            ) : (
                              <span className="text-zinc-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                              <MethodIcon method={p.method} />
                              {METHOD_LABELS[p.method] ?? p.method}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                            {fmtS(monto)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 pb-4">
          zmlashnails.com/finanzas · Solo administración
        </p>
      </main>
    </div>
  );
}
