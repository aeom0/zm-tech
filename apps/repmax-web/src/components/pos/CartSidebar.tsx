// ============================================================
// POS — carrito de venta
// ============================================================

"use client";

import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CartItemWeb } from "@/types/dashboard";

interface CartSidebarProps {
  items: CartItemWeb[];
  usdBsRate: number;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
  onCheckout: () => void;
}

export function CartSidebar({
  items,
  usdBsRate,
  onUpdateQuantity,
  onRemove,
  onClear,
  onCheckout,
}: CartSidebarProps) {
  const [confirmandoVaciar, setConfirmandoVaciar] = useState(false);

  const totalUsd = items.reduce((acc, it) => acc + it.subtotalUsd, 0);
  const totalBs = totalUsd * usdBsRate;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#F5F5F5]">Carrito</h2>
        {items.length > 0 ? (
          confirmandoVaciar ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#9E9E9E]">¿Vaciar?</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[#F44336] hover:bg-[#242424]"
                onClick={() => {
                  onClear();
                  setConfirmandoVaciar(false);
                }}
              >
                Sí
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[#9E9E9E] hover:bg-[#242424]"
                onClick={() => setConfirmandoVaciar(false)}
              >
                No
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[#9E9E9E] hover:bg-[#242424] hover:text-[#F44336]"
              onClick={() => setConfirmandoVaciar(true)}
            >
              Vaciar carrito
            </Button>
          )
        ) : null}
      </div>

      <div className="mt-4 flex-1 space-y-2 overflow-y-auto">
        {items.length === 0 ? (
          <p className="pt-8 text-center text-sm text-[#616161]">Carrito vacío</p>
        ) : (
          items.map((item) => (
            <div
              key={item.product.id}
              className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="line-clamp-2 flex-1 text-sm font-medium text-[#F5F5F5]">
                  {item.product.title}
                </p>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 shrink-0 text-[#9E9E9E] hover:bg-[#242424] hover:text-[#F44336]"
                  onClick={() => onRemove(item.product.id)}
                  aria-label="Quitar del carrito"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-7 w-7 border-[#2A2A2A] bg-[#242424] text-[#F5F5F5]"
                    onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    aria-label="Disminuir cantidad"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center text-sm text-[#F5F5F5]">{item.quantity}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-7 w-7 border-[#2A2A2A] bg-[#242424] text-[#F5F5F5]"
                    onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                    disabled={item.quantity >= item.product.stock}
                    aria-label="Aumentar cantidad"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <span className="text-sm font-semibold text-[#FF6B00]">
                  ${item.subtotalUsd.toFixed(2)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 space-y-1 border-t border-[#2A2A2A] pt-4">
        <div className="flex items-center justify-between text-sm text-[#9E9E9E]">
          <span>Total Bs</span>
          <span>Bs {totalBs.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-lg font-semibold text-[#F5F5F5]">
          <span>Total USD</span>
          <span>${totalUsd.toFixed(2)}</span>
        </div>
      </div>

      <Button
        type="button"
        disabled={items.length === 0}
        onClick={onCheckout}
        className="mt-3 w-full bg-[#FF6B00] py-6 text-base font-semibold text-[#0D0D0D] hover:bg-[#FF8533] disabled:bg-[#242424] disabled:text-[#616161]"
      >
        Cobrar
      </Button>
    </div>
  );
}
