"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ChevronDown,
  LogOut,
  Menu,
  Wrench,
  Sparkles,
  LayoutGrid,
  Clock,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type NavItem = {
  label: string;
  href?: string;
  icon: React.ReactNode;
  disabled?: boolean;
  badge?: string;
};

export function PanelShell({
  userEmail,
  children,
}: {
  userEmail: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = useMemo<NavItem[]>(
    () => [
      {
        label: "Horario",
        href: "/panel/horarios",
        icon: <Clock className="w-4 h-4" />,
      },
      {
        label: "Servicios",
        href: "/panel/servicios",
        icon: <Wrench className="w-4 h-4" />,
      },
      {
        label: "Packs",
        icon: <Sparkles className="w-4 h-4" />,
        disabled: true,
        badge: "Próximamente",
      },
      {
        label: "Promos",
        icon: <LayoutGrid className="w-4 h-4" />,
        disabled: true,
        badge: "Próximamente",
      },
    ],
    [],
  );

  const handleLogout = async () => {
    try {
      await supabase?.auth.signOut();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };

  const SidebarContent = (
    <div className="h-full flex flex-col">
      <div className="px-4 py-4 border-b border-white/[0.08]">
        <Link
          href="/panel/servicios"
          className="flex items-center gap-3"
          onClick={() => setMobileOpen(false)}
        >
          <div className="w-10 h-10 rounded-2xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center overflow-hidden">
            <Image
              src="/logo-diamondSparkle.svg"
              alt="SalonPro"
              width={24}
              height={24}
              className="opacity-90"
            />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-white">Panel</div>
            <div className="text-xs text-zinc-400">SalonPro</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = item.href ? pathname === item.href : false;
          const base =
            "w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl border transition-colors";
          const left = (
            <span className="flex items-center gap-2">
              <span
                className={[
                  "w-8 h-8 rounded-xl flex items-center justify-center border",
                  isActive
                    ? "bg-[#E91E8C]/15 border-[#E91E8C]/30 text-[#E91E8C]"
                    : "bg-white/[0.04] border-white/[0.08] text-zinc-300",
                ].join(" ")}
              >
                {item.icon}
              </span>
              <span
                className={[
                  "text-sm font-medium",
                  isActive ? "text-white" : "text-zinc-300",
                ].join(" ")}
              >
                {item.label}
              </span>
            </span>
          );

          const right = item.badge ? (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-zinc-400">
              {item.badge}
            </span>
          ) : null;

          if (item.disabled || !item.href) {
            return (
              <div
                key={item.label}
                className={[
                  base,
                  "bg-white/[0.02] border-white/[0.06] opacity-60 cursor-not-allowed",
                ].join(" ")}
              >
                {left}
                {right}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={[
                base,
                isActive
                  ? "bg-white/[0.06] border-white/[0.10]"
                  : "bg-transparent border-transparent hover:bg-white/[0.04] hover:border-white/[0.08]",
              ].join(" ")}
            >
              {left}
              {right}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/[0.08]">
        <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08]">
          <div className="min-w-0">
            <div className="text-xs text-zinc-500">Sesión</div>
            <div className="text-sm text-zinc-200 truncate">{userEmail}</div>
          </div>
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 text-red-300 hover:bg-red-500/15 border border-red-500/20 transition-colors text-sm font-semibold"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="dark">
      <div className="min-h-screen bg-[#0F0F0F] text-white flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:block w-[240px] bg-zinc-900 border-r border-white/[0.08]">
          {SidebarContent}
        </aside>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-40">
            <button
              type="button"
              aria-label="Cerrar menú"
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-black/60"
            />
            <div className="absolute left-0 top-0 bottom-0 w-[280px] bg-zinc-900 border-r border-white/[0.08]">
              {SidebarContent}
            </div>
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Mobile top bar */}
          <div className="md:hidden sticky top-0 z-30 bg-[#0F0F0F]/90 backdrop-blur border-b border-white/[0.08]">
            <div className="h-14 px-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] inline-flex items-center justify-center"
                aria-label="Abrir menú"
              >
                <Menu className="w-5 h-5 text-zinc-200" />
              </button>
              <div className="text-sm font-semibold text-white">
                {pathname?.startsWith("/panel/horarios")
                  ? "Panel · Horario"
                  : "Panel · Servicios"}
              </div>
              <div className="w-10" />
            </div>
          </div>

          <main className="p-4 md:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
