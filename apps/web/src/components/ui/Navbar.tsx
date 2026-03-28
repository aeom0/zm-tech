"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { GradientButton } from "@/components/ui/GradientButton";
import { NavbarDashboardLink } from "@/components/ui/NavbarDashboardLink";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { label: "Funciones", href: "#funciones" },
    { label: "Demo", href: "#demo" },
    { label: "Precios", href: "#precios" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo — ícono + wordmark + badge */}
        <a
          href="#"
          className="flex items-center gap-2.5 group"
          aria-label="SalonPro — inicio"
        >
          <Image
            src="/logo-diamondSparkle.svg"
            alt="SalonPro"
            width={44}
            height={50}
            priority
            className="h-11 w-auto shrink-0"
          />
          <span
            className="text-[19px] font-bold tracking-tight"
            style={{
              background: "linear-gradient(90deg, #E91E8C, #9C27B0, #1565C0)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            SalonPro
          </span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-[#E91E8C]/30 bg-[#E91E8C]/10 text-[#E91E8C] tracking-wide">
            Beta
          </span>
        </a>

        {/* Links — desktop */}
        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`text-sm font-medium transition-colors hover:text-white ${
                scrolled
                  ? "text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
                  : "text-white/70 hover:text-white"
              }`}
            >
              {l.label}
            </a>
          ))}
          <NavbarDashboardLink scrolled={scrolled} />
        </nav>

        {/* CTA — desktop */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="#"
            className={`text-sm font-medium transition-colors ${
              scrolled
                ? "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                : "text-white/60 hover:text-white"
            }`}
          >
            Iniciar sesión
          </a>
          {/* Divider */}
          <span className="w-px h-5 bg-white/15 dark:bg-white/10" />
          <GradientButton href="#precios" size="sm">
            Empezar gratis
          </GradientButton>
        </div>

        {/* Hamburger — mobile */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden p-2 rounded-lg"
          aria-label="Menú"
        >
          <div className="space-y-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`block w-6 h-0.5 transition-all duration-300 ${
                  scrolled ? "bg-zinc-800 dark:bg-zinc-200" : "bg-white"
                } ${
                  menuOpen && i === 0
                    ? "rotate-45 translate-y-2"
                    : menuOpen && i === 1
                      ? "opacity-0"
                      : menuOpen && i === 2
                        ? "-rotate-45 -translate-y-2"
                        : ""
                }`}
              />
            ))}
          </div>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 px-4 py-6 space-y-4">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="block text-white/90 font-medium py-2 hover:text-white transition-colors"
            >
              {l.label}
            </a>
          ))}
          <div onClick={() => setMenuOpen(false)} className="py-2">
            <NavbarDashboardLink scrolled={false} />
          </div>
          <div className="pt-2">
            <GradientButton
              href="#precios"
              size="md"
              className="w-full justify-center"
            >
              Empezar gratis — 14 días
            </GradientButton>
          </div>
        </div>
      )}
    </header>
  );
}
