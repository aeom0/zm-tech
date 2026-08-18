// ============================================================
// Layout del panel: sidebar, header, guard de sesión
// ============================================================

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ScanLine,
  ShoppingCart,
  Users,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import type { SubscriptionPlanWeb } from "@/types/dashboard";

const ENLACES: { href: string; label: string; icon: typeof LayoutDashboard }[] = [
  { href: "/dashboard/overview", label: "Resumen", icon: LayoutDashboard },
  { href: "/dashboard/pos", label: "Venta", icon: ScanLine },
  { href: "/dashboard/inventory", label: "Inventario", icon: Package },
  { href: "/dashboard/sales", label: "Ventas", icon: ShoppingCart },
  { href: "/dashboard/customers", label: "Clientes", icon: Users },
];

const TITULOS_RUTA: Record<string, string> = {
  "/dashboard/overview": "Resumen",
  "/dashboard/pos": "Venta",
  "/dashboard/inventory": "Inventario",
  "/dashboard/sales": "Ventas",
  "/dashboard/customers": "Clientes",
};

function InsigniaPlan({ plan }: { plan: SubscriptionPlanWeb }) {
  const estilos =
    plan === "pro"
      ? "border-[#FF6B00]/40 text-[#FF6B00]"
      : plan === "enterprise"
        ? "border-[#2196F3]/40 text-[#2196F3]"
        : "border-[#2A2A2A] text-[#9E9E9E]";
  const texto =
    plan === "pro" ? "Pro" : plan === "enterprise" ? "Enterprise" : "Basic";
  return (
    <span
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide",
        estilos,
      )}
    >
      {texto}
    </span>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { token, isLoading, logout, store, storeUser } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    if (!isLoading && !token) {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, token, router, pathname]);

  useEffect(() => {
    setMenuAbierto(false);
  }, [pathname]);

  if (isLoading || !token) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] p-6">
        <div className="mx-auto max-w-6xl space-y-4 animate-pulse">
          <div className="h-10 rounded-lg bg-[#1A1A1A]" />
          <div className="h-64 rounded-lg bg-[#1A1A1A]" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-lg bg-[#1A1A1A]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const titulo = TITULOS_RUTA[pathname] ?? "Panel";

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5F5]">
      {/* Sidebar escritorio */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[#2A2A2A] bg-[#1A1A1A] transition-transform lg:translate-x-0",
          menuAbierto ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="border-b border-[#2A2A2A] p-5">
          <BrandLogo variant="wordmark" height={26} />
          <p className="mt-2 truncate text-xs text-[#9E9E9E]">{store?.name ?? "—"}</p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {ENLACES.filter(
            ({ href }) => !(href === "/dashboard/pos" && storeUser?.role === "inventory"),
          ).map(({ href, label, icon: Icon }) => {
            const activo = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  activo
                    ? "border-l-2 border-[#FF6B00] bg-[#FF6B00]/10 text-[#FF6B00]"
                    : "border-l-2 border-transparent text-[#9E9E9E] hover:text-[#F5F5F5]",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#2A2A2A] p-4">
          <p className="truncate text-sm text-[#F5F5F5]">{storeUser?.fullName ?? "Usuario"}</p>
          <p className="text-xs capitalize text-[#9E9E9E]">{storeUser?.role ?? "—"}</p>
          <button
            type="button"
            onClick={() => {
              logout();
              router.replace("/login");
            }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[#2A2A2A] py-2 text-sm text-[#9E9E9E] transition hover:border-[#FF6B00]/50 hover:text-[#F5F5F5]"
          >
            <LogOut className="h-4 w-4" />
            Salir
          </button>
        </div>
      </aside>

      {/* Overlay móvil */}
      {menuAbierto ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMenuAbierto(false)}
        />
      ) : null}

      <div className="lg:pl-64">
        <header className="flex h-14 items-center justify-between border-b border-[#2A2A2A] bg-[#1A1A1A] px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg p-2 text-[#F5F5F5] lg:hidden"
              onClick={() => setMenuAbierto((v) => !v)}
              aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
            >
              {menuAbierto ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <BrandLogo variant="wordmark" height={22} className="lg:hidden" />
            <span className="hidden text-sm text-[#9E9E9E] lg:inline">
              <span className="text-[#616161]">Panel</span>
              <span className="mx-2">/</span>
              <span className="text-[#F5F5F5]">{titulo}</span>
            </span>
          </div>
          {store?.plan ? <InsigniaPlan plan={store.plan} /> : null}
        </header>

        <main className="p-4 md:p-6">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
