// ============================================================
// Resumen del negocio — KPIs y gráficas
// ============================================================

"use client";

import dynamic from "next/dynamic";
import {
  AlertTriangle,
  DollarSign,
  Package,
  ShoppingCart,
} from "lucide-react";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { etiquetaMetodoPago } from "@/lib/etiquetas-pago";
import type { DashboardData } from "@/types/dashboard";

// Recharts + ResponsiveContainer miden el DOM; evitar SSR para no hidratar mal ni height 0
const GraficaVentas = dynamic(() => import("@/components/dashboard/GraficaVentas"), {
  ssr: false,
  loading: () => (
    <div className="h-72 w-full animate-pulse rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]" />
  ),
});

function formatoDiaCorto(isoFecha: string): string {
  const d = new Date(`${isoFecha}T12:00:00.000Z`);
  return d.toLocaleDateString("es-VE", { weekday: "short" });
}

function EsqueletoOverview() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-5" />
        ))}
      </div>
      <div className="h-72 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-56 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]" />
        <div className="h-56 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]" />
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const { data, isLoading, error } = useAuthFetch<DashboardData>("/api/dashboard");

  if (isLoading) {
    return <EsqueletoOverview />;
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-[#F44336]/40 bg-[#1A1A1A] p-6 text-[#F44336]">
        {error ?? "No se pudieron cargar los datos"}
      </div>
    );
  }

  const ingresoFmt = new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(data.ingresoHoy);

  const datosGrafica = data.ventasUltimos7Dias.map((v) => ({
    etiqueta: formatoDiaCorto(v.fecha),
    total: v.total,
  }));

  const sinVentas7d = datosGrafica.every((d) => d.total === 0);
  const sinVentasHoy = data.topProductos.length === 0 && data.metodoPago.length === 0;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <article className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF6B00]/15">
              <ShoppingCart className="h-5 w-5 text-[#FF6B00]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#F5F5F5]">{data.ventasHoy}</p>
              <p className="text-xs font-medium uppercase tracking-wider text-[#9E9E9E]">
                Ventas hoy
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#4CAF50]/15">
              <DollarSign className="h-5 w-5 text-[#4CAF50]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#4CAF50]">{ingresoFmt}</p>
              <p className="text-xs font-medium uppercase tracking-wider text-[#9E9E9E]">
                Ingresos hoy
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2196F3]/15">
              <Package className="h-5 w-5 text-[#2196F3]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#F5F5F5]">{data.totalProductos}</p>
              <p className="text-xs font-medium uppercase tracking-wider text-[#9E9E9E]">
                Productos activos
              </p>
              <p className="mt-1 text-xs text-[#616161]">{data.totalClientes} clientes</p>
            </div>
          </div>
        </article>

        <article className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFC107]/15">
              <AlertTriangle className="h-5 w-5 text-[#FFC107]" />
            </div>
            <div>
              <p
                className={`text-2xl font-bold ${data.stockBajo > 0 ? "text-[#FFC107]" : "text-[#F5F5F5]"}`}
              >
                {data.stockBajo}
              </p>
              <p className="text-xs font-medium uppercase tracking-wider text-[#9E9E9E]">
                Stock bajo
              </p>
            </div>
          </div>
        </article>
      </div>

      <section className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-5">
        <h2 className="mb-4 text-lg font-semibold text-[#F5F5F5]">Ventas últimos 7 días</h2>
        {sinVentas7d ? (
          <p className="py-12 text-center text-sm text-[#9E9E9E]">
            Sin ventas en los últimos 7 días
          </p>
        ) : (
          <GraficaVentas datos={datosGrafica} />
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-5">
          <h2 className="mb-4 text-lg font-semibold text-[#F5F5F5]">Top productos (hoy)</h2>
          {data.topProductos.length === 0 ? (
            <p className="text-sm text-[#9E9E9E]">Sin ventas hoy</p>
          ) : (
            <ol className="space-y-3">
              {data.topProductos.map((p, i) => (
                <li key={`${p.title}-${p.brand}-${i}`} className="flex gap-3 text-sm">
                  <span className="w-6 shrink-0 font-bold text-[#9E9E9E]">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[#F5F5F5]">{p.title}</p>
                    <p className="text-xs text-[#9E9E9E]">{p.brand}</p>
                  </div>
                  <span className="shrink-0 font-semibold text-[#FF6B00]">{p.cantidad} u.</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-5">
          <h2 className="mb-4 text-lg font-semibold text-[#F5F5F5]">Métodos de pago (hoy)</h2>
          {sinVentasHoy ? (
            <p className="text-sm text-[#9E9E9E]">Sin ventas hoy</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.metodoPago.map((m) => (
                <li
                  key={m.metodo}
                  className="flex items-center justify-between rounded-lg border border-[#2A2A2A] bg-[#242424]/50 px-3 py-2"
                >
                  <span className="rounded-md bg-[#2A2A2A] px-2 py-0.5 text-xs text-[#9E9E9E]">
                    {etiquetaMetodoPago(m.metodo)}
                  </span>
                  <span className="text-sm font-medium text-[#F5F5F5]">
                    {new Intl.NumberFormat("es-VE", {
                      style: "currency",
                      currency: "USD",
                    }).format(m.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
