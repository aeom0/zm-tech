"use client";

import { useState } from "react";
import {
  Calendar,
  DollarSign,
  Users,
  Package,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
import { RevealWrapper } from "@/components/ui/RevealWrapper";
import { LUNARIS } from "@/lib/theme";
import { DemoBusinessPicker } from "@/components/ui/DemoBusinessPicker";

const DEMO_TABS: {
  id: string;
  label: string;
  icon: LucideIcon;
  title: string;
  description: string;
  mockupBg: string;
  accent: string;
  stats: { value: string; label: string }[];
}[] = [
  {
    id: "agenda",
    label: "Agenda",
    icon: Calendar,
    title: "Citas sin caos",
    description:
      "Vista diaria y semanal por profesional. Arrastra para reprogramar, toca para ver detalles. Sin conflictos, sin doble-reservas.",
    mockupBg: "#1A1A2E",
    accent: LUNARIS.primary,
    stats: [
      { value: "−40%", label: "Ausencias con recordatorio push" },
      { value: "3x", label: "Más rápido que un cuaderno" },
    ],
  },
  {
    id: "finanzas",
    label: "Finanzas",
    icon: DollarSign,
    title: "Tu caja, clara y al día",
    description:
      "Ingresos por día, semana y mes. Comisiones calculadas automáticamente. Cierra el mes en segundos, sin Excel ni calculadora.",
    mockupBg: "#0A1628",
    accent: LUNARIS.indigo,
    stats: [
      { value: "100%", label: "Comisiones calculadas solas" },
      { value: "<2 min", label: "Para cerrar el mes" },
    ],
  },
  {
    id: "personal",
    label: "Personal",
    icon: Users,
    title: "Tu equipo, coordinado",
    description:
      "Perfiles por profesional, horarios, servicios asignados y rendimiento. Cada uno ve solo lo que le corresponde desde su celular.",
    mockupBg: "#0F1A10",
    accent: LUNARIS.primaryMid,
    stats: [
      { value: "0", label: "Conflictos de agenda entre profesionales" },
      { value: "∞", label: "Profesionales soportados en plan Elite" },
    ],
  },
  {
    id: "inventario",
    label: "Inventario",
    icon: Package,
    title: "Nunca más sin insumos",
    description:
      "Alertas automáticas de stock bajo. Registro de uso por servicio. Deja de perder dinero por falta de control de materiales.",
    mockupBg: "#1A0F0A",
    accent: LUNARIS.primaryDark,
    stats: [
      { value: "−30%", label: "Desperdicio de insumos" },
      { value: "Automático", label: "Alerta cuando el stock baja" },
    ],
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: MessageCircle,
    title: "Agenda por WhatsApp",
    description:
      "El bot atiende a tus clientes 24/7: responde preguntas, muestra el catálogo, toma la cita y envía confirmación. Con IA para conversaciones naturales en español.",
    mockupBg: "#0B1418",
    accent: "#25D366",
    stats: [
      { value: "24/7", label: "Disponible sin intervención humana" },
      { value: "−60%", label: "Citas perdidas por falta de respuesta" },
    ],
  },
];

function DemoMockup({ tab }: { tab: (typeof DEMO_TABS)[0] }) {
  return (
    <div
      className="relative w-full max-w-sm mx-auto rounded-3xl overflow-hidden shadow-2xl border border-white/10"
      style={{ backgroundColor: tab.mockupBg, minHeight: 420 }}
    >
      {/* Status bar simulada */}
      <div className="flex items-center justify-between px-6 pt-4 pb-2">
        <span className="text-white/40 text-xs">9:41</span>
        <div className="flex gap-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-1 h-2.5 rounded-sm bg-white/30" />
          ))}
        </div>
      </div>

      {/* Header de pantalla */}
      <div className="px-6 pb-4 border-b border-white/10">
        <p className="text-white/50 text-xs uppercase tracking-widest mb-1">
          SalonPro
        </p>
        <h3 className="text-white font-bold text-lg">{tab.title}</h3>
      </div>

      {/* Contenido simulado */}
      <div className="p-4 space-y-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          >
            <div
              className="w-1 self-stretch rounded-full flex-shrink-0"
              style={{ backgroundColor: tab.accent, opacity: 1 - i * 0.2 }}
            />
            <div className="flex-1 min-w-0">
              <div
                className="h-2.5 rounded-full mb-2"
                style={{
                  backgroundColor: "rgba(255,255,255,0.25)",
                  width: `${75 - i * 8}%`,
                }}
              />
              <div
                className="h-2 rounded-full"
                style={{
                  backgroundColor: "rgba(255,255,255,0.12)",
                  width: `${50 - i * 5}%`,
                }}
              />
            </div>
            <div
              className="px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0"
              style={{ backgroundColor: tab.accent + "40", color: tab.accent }}
            >
              {(["Pendiente", "Confirmado", "En curso", "Listo"] as const)[i]}
            </div>
          </div>
        ))}
        <div
          className="mt-4 w-full h-12 rounded-2xl flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${tab.accent} 0%, ${LUNARIS.indigo} 100%)`,
          }}
        >
          <span className="text-white font-bold text-sm">Ver todo →</span>
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 100%, ${tab.accent}30 0%, transparent 70%)`,
        }}
      />
    </div>
  );
}

export function DemoSection() {
  const [activeTab, setActiveTab] = useState(DEMO_TABS[0].id);
  const currentTab = DEMO_TABS.find((t) => t.id === activeTab)!;

  return (
    <section
      id="demo"
      className="px-4 py-20 md:py-28 bg-zinc-950 overflow-hidden"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <RevealWrapper variant="up">
          <div className="text-center mb-14">
            <span className="text-accent font-semibold text-sm uppercase tracking-widest">
              Demo interactivo
            </span>
            <h2 className="text-3xl md:text-5xl font-bold mt-3 text-white">
              Míralo antes de comprarlo
            </h2>
            <p className="text-zinc-400 mt-4 max-w-xl mx-auto">
              Toca cada módulo y ve cómo funciona SalonPro en un celular real.
            </p>
          </div>
        </RevealWrapper>

        {/* Tabs */}
        <RevealWrapper variant="up" delay={100}>
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {DEMO_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? "text-white shadow-lg"
                    : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
                }`}
                style={
                  activeTab === tab.id
                    ? { background: LUNARIS.gradient.css }
                    : {}
                }
              >
                <tab.icon size={15} strokeWidth={2} />
                {tab.label}
              </button>
            ))}
          </div>
        </RevealWrapper>

        {/* Contenido: mockup + info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <RevealWrapper variant="up" delay={150}>
            <DemoMockup tab={currentTab} />
          </RevealWrapper>

          <RevealWrapper variant="up" delay={200}>
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  {currentTab.title}
                </h3>
                <p className="text-zinc-400 text-lg leading-relaxed">
                  {currentTab.description}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {currentTab.stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900"
                  >
                    <p
                      className="text-3xl font-bold mb-1"
                      style={{ color: currentTab.accent }}
                    >
                      {stat.value}
                    </p>
                    <p className="text-zinc-400 text-sm">{stat.label}</p>
                  </div>
                ))}
              </div>
              <a
                href="#precios"
                className="inline-flex items-center gap-2 text-sm font-semibold transition-colors"
                style={{ color: currentTab.accent }}
              >
                Empezar con {currentTab.label} gratis →
              </a>
            </div>
          </RevealWrapper>
        </div>

        {/* ── Separador ── */}
        <RevealWrapper variant="up" delay={100}>
          <div className="mt-24 pt-16 border-t border-zinc-800">
            <div className="text-center mb-12">
              <span
                className="inline-block text-sm font-semibold uppercase tracking-widest mb-3"
                style={{ color: LUNARIS.primary }}
              >
                Cuenta demo
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Pruébalo con tu tipo de negocio
              </h2>
              <p className="text-zinc-400 mt-4 max-w-lg mx-auto">
                Elige el negocio que más se parece al tuyo. Entra, explora,
                modifica lo que quieras — los datos se restablecen solos al
                cerrar sesión.
              </p>
            </div>

            <DemoBusinessPicker />
          </div>
        </RevealWrapper>
      </div>
    </section>
  );
}
