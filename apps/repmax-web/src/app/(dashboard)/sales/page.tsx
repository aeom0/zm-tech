// ============================================================
// Historial de ventas
// ============================================================

"use client";

import { useMemo, useState } from "react";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { etiquetaMetodoPago } from "@/lib/etiquetas-pago";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { VentaWeb } from "@/types/dashboard";

interface RespuestaVentas {
  sales: VentaWeb[];
  total: number;
  page: number;
  limit: number;
}

function EsqueletoVentas() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 rounded-lg bg-[#1A1A1A]" />
      <div className="h-96 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]" />
    </div>
  );
}

function badgeEstado(status: VentaWeb["status"]): string {
  if (status === "COMPLETED") {
    return "bg-[#4CAF50]/20 text-[#4CAF50]";
  }
  if (status === "CANCELLED") {
    return "bg-[#F44336]/20 text-[#F44336]";
  }
  return "bg-[#FFC107]/20 text-[#FFC107]";
}

function textoEstado(status: VentaWeb["status"]): string {
  if (status === "COMPLETED") return "Completada";
  if (status === "CANCELLED") return "Anulada";
  return "Reembolsada";
}

export default function SalesPage() {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [pagina, setPagina] = useState(1);
  const limite = 20;

  const url = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(pagina));
    p.set("limit", String(limite));
    if (desde.trim()) p.set("from", desde.trim());
    if (hasta.trim()) p.set("to", hasta.trim());
    return `/api/sales?${p.toString()}`;
  }, [desde, hasta, pagina, limite]);

  const { data, isLoading, error } = useAuthFetch<RespuestaVentas>(url);

  const inputDateClass =
    "rounded-lg border border-[#2A2A2A] bg-[#242424] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#FF6B00] focus:outline-none focus:ring-1 focus:ring-[#FF6B00]";

  if (isLoading && !data) {
    return <EsqueletoVentas />;
  }

  if (error && !data) {
    return (
      <div className="rounded-lg border border-[#F44336]/40 bg-[#1A1A1A] p-6 text-[#F44336]">
        {error}
      </div>
    );
  }

  const ventas = data?.sales ?? [];
  const total = data?.total ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / limite));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wider text-[#9E9E9E]">Desde</label>
          <input
            type="date"
            value={desde}
            onChange={(e) => {
              setPagina(1);
              setDesde(e.target.value);
            }}
            className={inputDateClass}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wider text-[#9E9E9E]">Hasta</label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => {
              setPagina(1);
              setHasta(e.target.value);
            }}
            className={inputDateClass}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]">
        <Table>
          <TableHeader className="bg-[#242424]">
            <TableRow className="border-[#2A2A2A] hover:bg-transparent">
              <TableHead># Factura</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Total USD</TableHead>
              <TableHead>Total Bs</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ventas.map((v, idx) => (
              <TableRow
                key={v.id}
                className={
                  idx % 2 === 1
                    ? "border-[#2A2A2A] bg-[#1E1E1E]/80 hover:bg-[#242424]/30"
                    : "border-[#2A2A2A] bg-[#1A1A1A] hover:bg-[#242424]/30"
                }
              >
                <TableCell className="font-mono text-sm text-[#F5F5F5]">
                  {v.invoiceNumber || "—"}
                </TableCell>
                <TableCell className="text-[#F5F5F5]">
                  {v.customer ? (
                    v.customer.fullName
                  ) : (
                    <span className="text-[#616161]">—</span>
                  )}
                </TableCell>
                <TableCell className="font-semibold text-[#FF6B00]">
                  ${v.totalUsd.toFixed(2)}
                </TableCell>
                <TableCell className="text-[#9E9E9E]">
                  {v.totalBs != null ? v.totalBs.toFixed(2) : <span className="text-[#616161]">—</span>}
                </TableCell>
                <TableCell className="text-sm text-[#9E9E9E]">
                  {etiquetaMetodoPago(v.paymentMethod)}
                </TableCell>
                <TableCell>
                  <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${badgeEstado(v.status)}`}>
                    {textoEstado(v.status)}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-[#9E9E9E]">
                  {new Date(v.createdAt).toLocaleString("es-VE", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {ventas.length === 0 ? (
          <p className="p-8 text-center text-sm text-[#9E9E9E]">No hay ventas en ese rango.</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[#9E9E9E]">
        <span>
          Página {pagina} de {totalPaginas} — {total} ventas
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-[#2A2A2A] bg-[#1A1A1A] text-[#F5F5F5] hover:bg-[#242424]"
            disabled={pagina <= 1}
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-[#2A2A2A] bg-[#1A1A1A] text-[#F5F5F5] hover:bg-[#242424]"
            disabled={pagina >= totalPaginas}
            onClick={() => setPagina((p) => p + 1)}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
