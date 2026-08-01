// ============================================================
// Clientes de la tienda
// ============================================================

"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ClienteWeb } from "@/types/dashboard";

interface RespuestaClientes {
  customers: ClienteWeb[];
  total: number;
  page: number;
  limit: number;
}

function EsqueletoClientes() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 rounded-lg bg-[#1A1A1A]" />
      <div className="h-96 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]" />
    </div>
  );
}

export default function CustomersPage() {
  const [q, setQ] = useState("");
  const [pagina, setPagina] = useState(1);
  const limite = 20;

  const url = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(pagina));
    p.set("limit", String(limite));
    if (q.trim()) p.set("q", q.trim());
    return `/api/customers?${p.toString()}`;
  }, [q, pagina, limite]);

  const { data, isLoading, error } = useAuthFetch<RespuestaClientes>(url);

  if (isLoading && !data) {
    return <EsqueletoClientes />;
  }

  if (error && !data) {
    return (
      <div className="rounded-lg border border-[#F44336]/40 bg-[#1A1A1A] p-6 text-[#F44336]">
        {error}
      </div>
    );
  }

  const clientes = data?.customers ?? [];
  const total = data?.total ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / limite));

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#616161]" />
        <Input
          placeholder="Nombre, teléfono o cédula…"
          value={q}
          onChange={(e) => {
            setPagina(1);
            setQ(e.target.value);
          }}
          className="border-[#2A2A2A] bg-[#242424] pl-9 text-[#F5F5F5] placeholder:text-[#616161] focus-visible:ring-[#FF6B00]"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]">
        <Table>
          <TableHeader className="bg-[#242424]">
            <TableRow className="border-[#2A2A2A] hover:bg-transparent">
              <TableHead>Nombre</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Cédula / RIF</TableHead>
              <TableHead>Compras</TableHead>
              <TableHead>Gastado (USD)</TableHead>
              <TableHead>Desde</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientes.map((c, idx) => (
              <TableRow
                key={c.id}
                className={
                  idx % 2 === 1
                    ? "border-[#2A2A2A] bg-[#1E1E1E]/80 hover:bg-[#242424]/30"
                    : "border-[#2A2A2A] bg-[#1A1A1A] hover:bg-[#242424]/30"
                }
              >
                <TableCell className="font-medium text-[#F5F5F5]">{c.fullName}</TableCell>
                <TableCell className="text-[#9E9E9E]">
                  {c.phone ? c.phone : <span className="text-[#616161]">—</span>}
                </TableCell>
                <TableCell className="text-[#9E9E9E]">
                  {c.cedulaRif ? c.cedulaRif : <span className="text-[#616161]">—</span>}
                </TableCell>
                <TableCell className="text-[#F5F5F5]">{c.totalPurchases}</TableCell>
                <TableCell className="font-semibold text-[#FF6B00]">
                  ${c.totalSpentUsd.toFixed(2)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-[#9E9E9E]">
                  {new Date(c.createdAt).toLocaleDateString("es-VE")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {clientes.length === 0 ? (
          <p className="p-8 text-center text-sm text-[#9E9E9E]">No hay clientes con ese criterio.</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[#9E9E9E]">
        <span>
          Página {pagina} de {totalPaginas} — {total} clientes
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
