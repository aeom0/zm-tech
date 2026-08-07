import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ClienteForm } from "@/components/clientes/ClienteForm";
import { clientesCopy, shellCopy } from "@/lib/content";

export default function NuevoClientePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href="/clientes"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {shellCopy.volver}
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{clientesCopy.nuevo}</CardTitle>
        </CardHeader>
        <CardContent>
          <ClienteForm />
        </CardContent>
      </Card>
    </div>
  );
}
