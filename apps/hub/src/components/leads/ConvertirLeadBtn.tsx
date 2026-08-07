"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { convertirLeadACliente } from "@/lib/actions/leads";
import { leadsCopy } from "@/lib/content";
import type { LeadOrigen } from "@/types/leads";

interface ConvertirLeadBtnProps {
  leadId: string;
  origen: LeadOrigen;
  nombre: string;
  contacto: string | null;
}

export function ConvertirLeadBtn({
  leadId,
  origen,
  nombre,
  contacto,
}: ConvertirLeadBtnProps) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleConvertir() {
    startTransition(async () => {
      const result = await convertirLeadACliente({
        contactId: origen === "landing" ? leadId : undefined,
        quoteLeadId: origen === "cotizador" ? leadId : undefined,
        name: nombre,
        email: null,
        phone: contacto,
      });

      if (result.ok) {
        router.push(`/clientes/${result.data.clienteId}`);
      }
    });
  }

  return (
    <Button
      variant="primary"
      size="sm"
      loading={pending}
      onClick={handleConvertir}
    >
      <UserPlus className="h-3.5 w-3.5" />
      {leadsCopy.convertirBtn}
    </Button>
  );
}
