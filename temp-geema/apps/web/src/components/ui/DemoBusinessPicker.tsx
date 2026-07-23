"use client";

import { useState } from "react";
import {
  Scissors,
  Sparkles,
  Zap,
  Leaf,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

const DEMO_BUSINESSES = [
  {
    id: "hair-salon",
    name: "Salón Glamour",
    type: "Peluquería & Coloración",
    country: "🇨🇴 Colombia · COP",
    email: "demo.salon@ejemplo.com",
    accent: "#E91E8C",
    secondaryAccent: "#9C27B0",
    icon: Zap,
    employees: 4,
    services: 12,
    highlight: "Balayage · Keratina · Coloración",
  },
  {
    id: "spa-nails",
    name: "Nail & Glow Spa",
    type: "Spa de Uñas",
    country: "🇵🇪 Perú · PEN",
    email: "demo.nails@ejemplo.com",
    accent: "#00BCD4",
    secondaryAccent: "#009688",
    icon: Sparkles,
    employees: 4,
    services: 12,
    highlight: "Acrílicas · Gel · Nail Art",
  },
  {
    id: "barbershop",
    name: "The Sharp Cut",
    type: "Barbería",
    country: "🇲🇽 México · MXN",
    email: "demo.barberia@ejemplo.com",
    accent: "#FF5722",
    secondaryAccent: "#FF9800",
    icon: Scissors,
    employees: 4,
    services: 11,
    highlight: "Fade · Barba · Combos",
  },
  {
    id: "full-aesthetic",
    name: "Aura Estética",
    type: "Centro Estético Integral",
    country: "🇻🇪 Venezuela · USD",
    email: "demo.estetica@ejemplo.com",
    accent: "#673AB7",
    secondaryAccent: "#3F51B5",
    icon: Leaf,
    employees: 4,
    services: 16,
    highlight: "Facial · Corporal · Extensiones",
  },
] as const;

const PASSWORD = "Geema2025!";

export function DemoBusinessPicker() {
  const [selected, setSelected] = useState<string | null>(null);
  const [copied, setCopied] = useState<"email" | "pass" | null>(null);

  const selectedBiz = DEMO_BUSINESSES.find((b) => b.id === selected);

  const copyToClipboard = async (text: string, type: "email" | "pass") => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const loginUrl = selectedBiz
    ? `/finanzas/login?demo=${encodeURIComponent(selectedBiz.email)}`
    : "/finanzas/login";

  return (
    <div className="space-y-6">
      {/* Grid de cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {DEMO_BUSINESSES.map((biz) => {
          const Icon = biz.icon;
          const isSelected = selected === biz.id;
          return (
            <button
              key={biz.id}
              onClick={() => setSelected(isSelected ? null : biz.id)}
              className="relative text-left p-5 rounded-2xl border transition-all duration-200 group"
              style={{
                backgroundColor: isSelected
                  ? `${biz.accent}15`
                  : "rgba(255,255,255,0.03)",
                borderColor: isSelected ? biz.accent : "rgba(255,255,255,0.08)",
                boxShadow: isSelected ? `0 0 24px ${biz.accent}30` : "none",
              }}
            >
              {/* Ícono */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{
                  background: `linear-gradient(135deg, ${biz.accent} 0%, ${biz.secondaryAccent} 100%)`,
                }}
              >
                <Icon size={18} className="text-white" strokeWidth={2.5} />
              </div>

              {/* Info */}
              <p className="text-white font-bold text-base mb-0.5">
                {biz.name}
              </p>
              <p className="text-zinc-400 text-xs mb-3">{biz.type}</p>

              {/* Pills de info */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-zinc-300">
                  {biz.employees} profesionales
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-zinc-300">
                  {biz.services} servicios
                </span>
              </div>

              <p className="text-[11px] text-zinc-500">{biz.highlight}</p>
              <p className="text-[11px] mt-2" style={{ color: biz.accent }}>
                {biz.country}
              </p>

              {/* Checkmark si seleccionado */}
              {isSelected && (
                <div
                  className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: biz.accent }}
                >
                  ✓
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Panel de acceso — aparece al seleccionar */}
      {selectedBiz && (
        <div
          className="rounded-2xl border p-6 transition-all duration-300"
          style={{
            backgroundColor: `${selectedBiz.accent}0D`,
            borderColor: `${selectedBiz.accent}40`,
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            {/* Credenciales */}
            <div className="flex-1 space-y-3">
              <p className="text-zinc-300 text-sm font-semibold">
                Credenciales de acceso
              </p>

              {/* Email */}
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5">
                  <p className="text-[10px] text-zinc-500 mb-0.5">Email</p>
                  <p className="text-white text-sm font-mono">
                    {selectedBiz.email}
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(selectedBiz.email, "email")}
                  className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors"
                  style={{
                    borderColor: `${selectedBiz.accent}60`,
                    color: copied === "email" ? selectedBiz.accent : "#71717a",
                    backgroundColor:
                      copied === "email"
                        ? `${selectedBiz.accent}15`
                        : "transparent",
                  }}
                >
                  {copied === "email" ? "✓" : "Copiar"}
                </button>
              </div>

              {/* Contraseña */}
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5">
                  <p className="text-[10px] text-zinc-500 mb-0.5">Contraseña</p>
                  <p className="text-white text-sm font-mono">{PASSWORD}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(PASSWORD, "pass")}
                  className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors"
                  style={{
                    borderColor: `${selectedBiz.accent}60`,
                    color: copied === "pass" ? selectedBiz.accent : "#71717a",
                    backgroundColor:
                      copied === "pass"
                        ? `${selectedBiz.accent}15`
                        : "transparent",
                  }}
                >
                  {copied === "pass" ? "✓" : "Copiar"}
                </button>
              </div>
            </div>

            {/* CTA + nota reset */}
            <div className="flex flex-col items-center sm:items-end gap-3">
              <a
                href={loginUrl}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-white font-bold text-sm transition-transform hover:scale-105 active:scale-95"
                style={{
                  background: `linear-gradient(135deg, ${selectedBiz.accent} 0%, ${selectedBiz.secondaryAccent} 100%)`,
                  boxShadow: `0 4px 20px ${selectedBiz.accent}50`,
                }}
              >
                Entrar al demo
                <ArrowRight size={16} strokeWidth={2.5} />
              </a>
              <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
                <RefreshCw size={11} strokeWidth={2} />
                <span>Datos se restablecen al cerrar sesión</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
