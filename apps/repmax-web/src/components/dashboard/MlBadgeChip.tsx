import { Badge } from "@/components/ui/badge";
import type { MlBadgeKind } from "@/lib/ml-readiness";
import { etiquetaBadgeMl } from "@/lib/ml-readiness";
import { cn } from "@/lib/utils";

const ESTILOS: Record<Exclude<MlBadgeKind, "none">, string> = {
  incompleto: "bg-[#F59E0B]/20 text-[#F59E0B] border-transparent",
  listo: "bg-[#22C55E]/20 text-[#22C55E] border-transparent",
  exportado: "bg-[#3B82F6]/20 text-[#3B82F6] border-transparent",
  en_ml: "bg-[#FFE600]/30 text-[#FFE600] border-transparent",
  actualizar: "bg-[#EF4444]/20 text-[#EF4444] border-transparent",
};

export function MlBadgeChip({ kind }: { kind: MlBadgeKind }) {
  if (kind === "none") return null;
  return (
    <Badge className={cn("text-[10px] font-semibold", ESTILOS[kind])}>
      {etiquetaBadgeMl(kind)}
    </Badge>
  );
}
