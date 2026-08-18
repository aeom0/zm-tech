// ============================================================
// POS de escritorio — /dashboard/pos
// ============================================================

"use client";

import { useCallback, useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { fetchActiveCashSession, fetchProducts } from "@/lib/repmax-queries";
import { useBarcodeScan } from "@/lib/hardware/services/barcodeService";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ProductSearchGrid } from "@/components/pos/ProductSearchGrid";
import { CartSidebar } from "@/components/pos/CartSidebar";
import { CheckoutSheet } from "@/components/pos/CheckoutSheet";
import type { CartItemWeb, CashSessionWeb, ProductoWeb } from "@/types/dashboard";

export default function PosPage() {
  const { store, storeUser } = useAuth();
  const { toast } = useToast();
  const [cart, setCart] = useState<CartItemWeb[]>([]);
  const [activeSession, setActiveSession] = useState<CashSessionWeb | null>(null);
  const [carritoMovilAbierto, setCarritoMovilAbierto] = useState(false);
  const [checkoutAbierto, setCheckoutAbierto] = useState(false);

  useEffect(() => {
    if (!store?.id) return;
    const client = createClient();
    fetchActiveCashSession(client, store.id)
      .then(setActiveSession)
      .catch(() => setActiveSession(null));
  }, [store?.id]);

  const addItem = useCallback((product: ProductoWeb) => {
    setCart((prev) => {
      const existente = prev.find((it) => it.product.id === product.id);
      if (existente) {
        const nuevaCantidad = Math.min(existente.quantity + 1, product.stock);
        return prev.map((it) =>
          it.product.id === product.id
            ? { ...it, quantity: nuevaCantidad, subtotalUsd: nuevaCantidad * product.priceUsd }
            : it,
        );
      }
      return [...prev, { product, quantity: 1, subtotalUsd: product.priceUsd }];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setCart((prev) => {
      if (quantity <= 0) return prev.filter((it) => it.product.id !== productId);
      return prev.map((it) =>
        it.product.id === productId
          ? {
              ...it,
              quantity: Math.min(quantity, it.product.stock),
              subtotalUsd: Math.min(quantity, it.product.stock) * it.product.priceUsd,
            }
          : it,
      );
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setCart((prev) => prev.filter((it) => it.product.id !== productId));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const handleScan = useCallback(
    async (codigo: string) => {
      if (!store?.id) return;
      const existente = cart.find(
        (it) => it.product.barcode === codigo || it.product.partNumber === codigo,
      );
      if (existente) {
        addItem(existente.product);
        return;
      }
      try {
        const client = createClient();
        const params = new URLSearchParams();
        params.set("page", "1");
        params.set("limit", "1");
        params.set("q", codigo);
        const res = await fetchProducts(client, params, store.usdBsRate);
        const match = res.products.find(
          (p) => p.barcode === codigo || p.partNumber === codigo,
        );
        if (match && match.isActive && match.stock > 0) {
          addItem(match);
          toast({ title: "Producto agregado", description: match.title });
        } else {
          toast({
            title: "Código no encontrado",
            description: codigo,
            variant: "destructive",
          });
        }
      } catch {
        toast({
          title: "Error al buscar código",
          description: codigo,
          variant: "destructive",
        });
      }
    },
    [store?.id, store?.usdBsRate, cart, addItem, toast],
  );

  useBarcodeScan(
    (codigo) => {
      void handleScan(codigo);
    },
    { enabled: !checkoutAbierto },
  );

  if (storeUser?.role === "inventory") {
    return (
      <div className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-8 text-center text-[#9E9E9E]">
        No tienes acceso a Ventas.
      </div>
    );
  }

  if (!store || !storeUser) {
    return (
      <div className="h-64 animate-pulse rounded-lg bg-[#1A1A1A]" />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <ProductSearchGrid storeId={store.id} usdBsRate={store.usdBsRate} onAdd={addItem} />

      {/* Carrito fijo en escritorio */}
      <div className="hidden rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-4 lg:block">
        <CartSidebar
          items={cart}
          usdBsRate={store.usdBsRate}
          onUpdateQuantity={updateQuantity}
          onRemove={removeItem}
          onClear={clearCart}
          onCheckout={() => setCheckoutAbierto(true)}
        />
      </div>

      {/* Botón flotante + Sheet de carrito en móvil */}
      <Button
        type="button"
        onClick={() => setCarritoMovilAbierto(true)}
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full bg-[#FF6B00] px-5 py-6 font-semibold text-[#0D0D0D] shadow-lg hover:bg-[#FF8533] lg:hidden"
      >
        <ShoppingCart className="h-5 w-5" />
        {cart.length > 0 ? `Carrito (${cart.length})` : "Carrito"}
      </Button>

      <Sheet open={carritoMovilAbierto} onOpenChange={setCarritoMovilAbierto}>
        <SheetContent side="right" className="border-[#2A2A2A] bg-[#1A1A1A]">
          <SheetHeader>
            <SheetTitle>Carrito</SheetTitle>
          </SheetHeader>
          <CartSidebar
            items={cart}
            usdBsRate={store.usdBsRate}
            onUpdateQuantity={updateQuantity}
            onRemove={removeItem}
            onClear={clearCart}
            onCheckout={() => {
              setCarritoMovilAbierto(false);
              setCheckoutAbierto(true);
            }}
          />
        </SheetContent>
      </Sheet>

      <CheckoutSheet
        open={checkoutAbierto}
        onOpenChange={setCheckoutAbierto}
        items={cart}
        storeId={store.id}
        cashierId={storeUser.id}
        usdBsRate={store.usdBsRate}
        activeSession={activeSession}
        onSuccess={clearCart}
      />
    </div>
  );
}
