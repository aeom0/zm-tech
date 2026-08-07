"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Briefcase,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Ticket,
  X,
} from "lucide-react";
import { HUB_MEMBER_ROLE_LABELS } from "@zmtech/hub-schema";
import { useAuth } from "@/context/AuthContext";
import {
  brand,
  navItems,
  routeTitles,
  shellCopy,
  type NavItem,
} from "@/lib/content";
import { cn } from "@/lib/utils";

const ICONS: Record<NavItem["icon"], typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  clientes: Briefcase,
  proyectos: FolderKanban,
  leads: Inbox,
  tickets: Ticket,
  recordatorios: Bell,
  comunicaciones: MessageSquare,
};

export function PanelShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { token, isLoading, logout, member, sinAcceso, user } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!token) {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
      return;
    }
    if (sinAcceso || !member) {
      router.replace("/sin-acceso");
    }
  }, [isLoading, token, member, sinAcceso, router, pathname]);

  if (isLoading || !token || !member) {
    return (
      <div className="min-h-screen p-6">
        <div className="mx-auto max-w-6xl space-y-4 animate-pulse">
          <div className="h-10 rounded-lg bg-surface" />
          <div className="h-64 rounded-lg bg-surface" />
        </div>
      </div>
    );
  }

  const titulo = routeTitles[pathname] ?? shellCopy.panelLabel;
  const nombre =
    member.displayName?.trim() || user?.email?.split("@")[0] || "Usuario";

  return (
    <div className="min-h-screen text-foreground">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-surface transition-transform lg:translate-x-0",
          menuAbierto ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="border-b border-border p-5">
          <div className="font-display text-xl font-bold tracking-tight">
            {brand.name} <span className="text-accent">{brand.product}</span>
          </div>
          <p className="mt-1 truncate text-xs text-muted">{brand.tagline}</p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => {
            const Icon = ICONS[item.icon];
            const activo = pathname === item.href;
            if (item.disabled) {
              return (
                <span
                  key={item.href}
                  title={shellCopy.comingSoon}
                  className="flex cursor-not-allowed items-center gap-3 rounded-lg border-l-2 border-transparent px-3 py-2.5 text-sm text-muted/50"
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  <span className="text-[10px] uppercase tracking-wide">
                    {shellCopy.comingSoon}
                  </span>
                </span>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuAbierto(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  activo
                    ? "border-l-2 border-accent bg-accent-soft text-accent"
                    : "border-l-2 border-transparent text-muted hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-4">
          <p className="truncate text-sm text-foreground">{nombre}</p>
          <p className="text-xs text-muted">
            {HUB_MEMBER_ROLE_LABELS[member.role]}
          </p>
          <button
            type="button"
            onClick={() => {
              void logout().then(() => router.replace("/login"));
            }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2 text-sm text-muted transition hover:border-accent/50 hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            {shellCopy.logout}
          </button>
        </div>
      </aside>

      {menuAbierto ? (
        <button
          type="button"
          aria-label={shellCopy.closeMenu}
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMenuAbierto(false)}
        />
      ) : null}

      <div className="lg:pl-64">
        <header className="flex h-14 items-center justify-between border-b border-border bg-surface/80 px-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg p-2 text-foreground lg:hidden"
              onClick={() => setMenuAbierto((v) => !v)}
              aria-label={menuAbierto ? shellCopy.closeMenu : shellCopy.openMenu}
            >
              {menuAbierto ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
            <span className="font-display font-semibold lg:hidden">
              {brand.name} <span className="text-accent">{brand.product}</span>
            </span>
            <span className="hidden text-sm text-muted lg:inline">
              <span className="text-muted/70">{shellCopy.panelLabel}</span>
              <span className="mx-2">/</span>
              <span className="text-foreground">{titulo}</span>
            </span>
          </div>
        </header>

        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
