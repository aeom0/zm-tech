"use client";

import Link from "next/link";
import { Home, LayoutDashboard, LogOut } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";

interface DashboardShellProps {
  businessName: string | null;
  children: React.ReactNode;
  topSlot?: React.ReactNode;
}

export function DashboardShell({
  businessName,
  children,
  topSlot,
}: DashboardShellProps) {
  const { profile, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0F0F0F]/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors shrink-0"
            >
              <Home className="w-4 h-4" aria-hidden />
              <span className="hidden min-[400px]:inline">Inicio</span>
            </Link>
            <span className="text-white/25 hidden sm:inline">|</span>
            <div className="flex items-center gap-2 min-w-0">
              <LayoutDashboard className="w-5 h-5 shrink-0 text-pink-400" />
              <div className="min-w-0">
                <p className="text-xs text-white/45 truncate">Panel</p>
                <p className="text-sm font-semibold truncate leading-tight">
                  {businessName ?? "Tu negocio"}
                </p>
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/finanzas"
              className="text-sm text-white/60 hover:text-white transition-colors hidden sm:inline"
            >
              Finanzas
            </Link>
            <Link
              href="/panel/servicios"
              className="text-sm text-white/60 hover:text-white transition-colors hidden sm:inline"
            >
              Servicios
            </Link>
            {profile?.full_name ? (
              <span className="text-sm text-white/50 max-w-[120px] truncate hidden md:inline">
                {profile.full_name}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 hover:bg-white/5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </nav>
        </div>
        {topSlot ? (
          <div className="max-w-6xl mx-auto px-4 pb-4">{topSlot}</div>
        ) : null}
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 pb-16">{children}</main>
    </div>
  );
}
