"use client";

import { useState } from "react";
import { Pencil, ChevronUp } from "lucide-react";
import { ClienteForm } from "./ClienteForm";
import { shellCopy } from "@/lib/content";
import type { HubClient } from "@zmtech/hub-schema";

interface ClienteEditFormProps {
  cliente: HubClient;
}

export function ClienteEditForm({ cliente }: ClienteEditFormProps) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-surface">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-sm font-medium text-muted hover:text-foreground"
      >
        <span className="flex items-center gap-2">
          <Pencil className="h-4 w-4" />
          {shellCopy.editar} datos del cliente
        </span>
        <ChevronUp
          className={`h-4 w-4 transition-transform ${abierto ? "rotate-0" : "rotate-180"}`}
        />
      </button>
      {abierto ? (
        <div className="border-t border-border px-5 pb-5 pt-4">
          <ClienteForm
            cliente={cliente}
            onSuccess={() => setAbierto(false)}
          />
        </div>
      ) : null}
    </div>
  );
}
