// ============================================================
// POS — cobro (Sheet)
// ============================================================

"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  convertirUsdABs,
  validarDetallesPagoMixto,
  type DetallesPago,
  type MonedaPago,
} from "@zmtech/tasas";
import { createClient } from "@/lib/supabase/client";
import { createSale } from "@/lib/repmax-queries";
import { useToast } from "@/hooks/use-toast";
import { PAYMENT_METHODS_WEB } from "@/constants/payment-methods";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type {
  CartItemWeb,
  CashSessionWeb,
  PaymentMethodWeb,
  SaleCreatePayload,
} from "@/types/dashboard";

interface CheckoutSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItemWeb[];
  storeId: string;
  cashierId: string;
  usdBsRate: number;
  activeSession: CashSessionWeb | null;
  onSuccess: () => void;
}

export function CheckoutSheet({
  open,
  onOpenChange,
  items,
  storeId,
  cashierId,
  usdBsRate,
  activeSession,
  onSuccess,
}: CheckoutSheetProps) {
  const { toast } = useToast();
  const [metodoPago, setMetodoPago] = useState<PaymentMethodWeb>("CASH_USD");
  const [notas, setNotas] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [montoMixtoUsd, setMontoMixtoUsd] = useState("");
  const [montoMixtoBs, setMontoMixtoBs] = useState("");

  const totalUsd = items.reduce((acc, it) => acc + it.subtotalUsd, 0);
  const totalBs = convertirUsdABs(totalUsd, usdBsRate);
  const esMetodoBs = ["CASH_BS", "PAGO_MOVIL", "TRANSFERENCIA"].includes(metodoPago);
  const detallesMixtos: DetallesPago = {
    CASH_USD: { monto: Number(montoMixtoUsd) || 0, moneda: "USD" },
    CASH_BS: { monto: Number(montoMixtoBs) || 0, moneda: "BS" },
  };
  const validacionMixta =
    metodoPago === "MIXED"
      ? validarDetallesPagoMixto(detallesMixtos, totalUsd, usdBsRate)
      : null;

  function crearDetallesPago(): DetallesPago {
    if (metodoPago === "MIXED") return detallesMixtos;
    const moneda: MonedaPago = esMetodoBs ? "BS" : "USD";
    return {
      [metodoPago]: {
        monto: moneda === "BS" ? totalBs : totalUsd,
        moneda,
      },
    };
  }

  async function confirmarVenta() {
    if (items.length === 0) return;
    if (validacionMixta && !validacionMixta.valido) {
      toast({
        title: "Montos mixtos incompletos",
        description: validacionMixta.mensaje,
        variant: "destructive",
      });
      return;
    }
    setConfirmando(true);
    try {
      const client = createClient();
      const payload: SaleCreatePayload = {
        storeId,
        sessionId: activeSession?.id ?? null,
        customerId: null,
        cashierId,
        paymentMethod: metodoPago,
        paymentDetails: crearDetallesPago(),
        usdBsRate,
        notes: notas.trim() || null,
        items: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPriceUsd: item.product.priceUsd,
          productSnapshot: {
            title: item.product.title,
            brand: item.product.brand,
            model: item.product.model,
            part_number: item.product.partNumber,
            photo: item.product.photos?.[0] ?? null,
          },
        })),
      };
      await createSale(client, payload);
      toast({
        title: "Venta registrada",
        description: `Total $${totalUsd.toFixed(2)}`,
      });
      setNotas("");
      setMetodoPago("CASH_USD");
      setMontoMixtoUsd("");
      setMontoMixtoBs("");
      onSuccess();
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "No se pudo registrar la venta",
        description: e instanceof Error ? e.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setConfirmando(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="border-[#2A2A2A] bg-[#1A1A1A]">
        <SheetHeader>
          <SheetTitle className="pr-8">Cobrar</SheetTitle>
          <p className="text-sm text-[#9E9E9E]">
            {items.length} producto{items.length === 1 ? "" : "s"} — total $
            {totalUsd.toFixed(2)}
          </p>
          <p className="text-sm font-medium text-[#FF8533]">
            Equivalente: Bs {totalBs.toFixed(2)} · tasa BCV Bs {usdBsRate.toFixed(2)}
          </p>
        </SheetHeader>

        {!activeSession ? (
          <div className="flex items-start gap-2 rounded-lg border border-[#FFC107]/40 bg-[#FFC107]/10 p-3 text-sm text-[#FFC107]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>No hay caja abierta. Puedes continuar, pero recuerda abrirla.</span>
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[#F5F5F5]">Método de pago</p>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS_WEB.map((m) => (
                <label
                  key={m.value}
                  className={
                    "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm " +
                    (metodoPago === m.value
                      ? "border-[#FF6B00] bg-[#FF6B00]/10 text-[#F5F5F5]"
                      : "border-[#2A2A2A] bg-[#242424] text-[#9E9E9E]")
                  }
                >
                  <input
                    type="radio"
                    name="metodoPago"
                    value={m.value}
                    checked={metodoPago === m.value}
                    onChange={() => setMetodoPago(m.value)}
                    className="h-3.5 w-3.5 text-[#FF6B00] focus:ring-[#FF6B00]"
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[#2A2A2A] bg-[#242424] p-3 text-sm">
            <div className="flex items-center justify-between text-[#9E9E9E]">
              <span>Total USD</span>
              <span className="font-semibold text-[#F5F5F5]">${totalUsd.toFixed(2)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[#9E9E9E]">
              <span>Total a cobrar en Bs</span>
              <span className="font-semibold text-[#FF8533]">Bs {totalBs.toFixed(2)}</span>
            </div>
          </div>

          {metodoPago === "MIXED" ? (
            <div className="space-y-3 rounded-lg border border-[#FF6B00]/40 bg-[#FF6B00]/5 p-3">
              <p className="text-sm font-medium text-[#F5F5F5]">Desglose del pago mixto</p>
              <label className="block text-xs text-[#9E9E9E]" htmlFor="mixto-usd">
                Monto en USD
                <input
                  id="mixto-usd"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  type="number"
                  value={montoMixtoUsd}
                  onChange={(e) => setMontoMixtoUsd(e.target.value)}
                  className="mt-1 w-full rounded-md border border-[#2A2A2A] bg-[#242424] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#FF6B00] focus:outline-none"
                />
              </label>
              <label className="block text-xs text-[#9E9E9E]" htmlFor="mixto-bs">
                Monto en Bs
                <input
                  id="mixto-bs"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  type="number"
                  value={montoMixtoBs}
                  onChange={(e) => setMontoMixtoBs(e.target.value)}
                  className="mt-1 w-full rounded-md border border-[#2A2A2A] bg-[#242424] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#FF6B00] focus:outline-none"
                />
              </label>
              <p className={validacionMixta?.valido ? "text-xs text-[#4CAF50]" : "text-xs text-[#FFC107]"}>
                {validacionMixta?.valido
                  ? "El desglose coincide con el total."
                  : validacionMixta?.mensaje}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-[#2A2A2A] bg-[#242424] p-3 text-sm text-[#9E9E9E]">
              Monto a cobrar:{" "}
              <span className="font-semibold text-[#F5F5F5]">
                {esMetodoBs ? `Bs ${totalBs.toFixed(2)}` : `$${totalUsd.toFixed(2)}`}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="notas" className="text-sm font-medium text-[#F5F5F5]">
              Notas (opcional)
            </label>
            <textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-[#2A2A2A] bg-[#242424] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#FF6B00] focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
            />
          </div>

          <Button
            type="button"
            disabled={confirmando || items.length === 0}
            onClick={() => void confirmarVenta()}
            className="w-full bg-[#FF6B00] py-6 text-base font-semibold text-[#0D0D0D] hover:bg-[#FF8533]"
          >
            {confirmando ? "Confirmando…" : "Confirmar venta"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
