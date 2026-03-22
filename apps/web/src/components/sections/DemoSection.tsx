"use client";

import { useState } from "react";
import { RevealWrapper } from "@/components/ui/RevealWrapper";

const DEMO_TABS = [
  {
    id: "agenda",
    label: "📅 Agenda",
    title: "Citas sin caos",
    description:
      "Vista diaria y semanal por profesional. Arrastra para reprogramar, toca para ver detalles. Sin conflictos, sin doble-reservas.",
    mockupBg: "#1A1A2E",
    accent: "#E91E8C",
    stats: [
      { value: "−40%", label: "Ausencias con recordatorio push" },
      { value: "3x", label: "Más rápido que un cuaderno" },
    ],
  },
  {
    id: "finanzas",
    label: "💰 Finanzas",
    title: "Tu caja, clara y al día",
    description:
      "Ingresos por día, semana y mes. Comisiones calculadas automáticamente. Cierra el mes en segundos, sin Excel ni calculadora.",
    mockupBg: "#0A1628",
    accent: "#3D3D8F",
    stats: [
      { value: "100%", label: "Comisiones calculadas solas" },
      { value: "<2 min", label: "Para cerrar el mes" },
    ],
  },
  {
    id: "personal",
    label: "👥 Personal",
    title: "Tu equipo, coordinado",
    description:
      "Perfiles por profesional, horarios, servicios asignados y rendimiento. Cada uno ve solo lo que le corresponde desde su celular.",
    mockupBg: "#0F1A10",
    accent: "#1565C0",
    stats: [
      { value: "0", label: "Conflictos de agenda entre profesionales" },
      { value: "∞", label: "Profesionales soportados en plan Elite" },
    ],
  },
  {
    id: "inventario",
    label: "📦 Inventario",
    title: "Nunca más sin insumos",
    description:
      "Alertas automáticas de stock bajo. Registro de uso por servicio. Deja de perder plata por falta de control de materiales.",
    mockupBg: "#1A0F0A",
    accent: "#9C27B0",
    stats: [
      { value: "−30%", label: "Desperdicio de insumos" },
      { value: "Automático", label: "Alerta cuando el stock baja" },
    ],
  },
  {
    id: "whatsapp",
    label: "💬 WhatsApp",
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

      {/* Contenido simulado — filas de datos */}
      <div className="p-4 space-y-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          >
            {/* Franja de color del empleado */}
            <div
              className="w-1 self-stretch rounded-full flex-shrink-0"
              style={{
                backgroundColor: tab.accent,
                opacity: 1 - i * 0.2,
              }}
            />
            {/* Info */}
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
            {/* Badge */}
            <div
              className="px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0"
              style={{ backgroundColor: tab.accent + "40", color: tab.accent }}
            >
              {(["Pendiente", "Confirmado", "En curso", "Listo"] as const)[i]}
            </div>
          </div>
        ))}

        {/* Botón CTA simulado */}
        <div
          className="mt-4 w-full h-12 rounded-2xl flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${tab.accent} 0%, #1565C0 100%)`,
          }}
        >
          <span className="text-white font-bold text-sm">Ver todo →</span>
        </div>
      </div>

      {/* Glow reflection en la parte inferior */}
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
                className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? "text-white shadow-lg"
                    : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
                }`}
                style={
                  activeTab === tab.id
                    ? {
                        background:
                          "linear-gradient(135deg, #E91E8C 0%, #9C27B0 35%, #3D3D8F 70%, #1565C0 100%)",
                      }
                    : {}
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
        </RevealWrapper>

        {/* Contenido principal: mockup + info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Mockup */}
          <RevealWrapper variant="up" delay={150}>
            <DemoMockup tab={currentTab} />
          </RevealWrapper>

          {/* Texto + stats */}
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

              {/* Stats */}
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

              {/* CTA inline */}
              <a
                href="#precios"
                className="inline-flex items-center gap-2 text-sm font-semibold transition-colors"
                style={{ color: currentTab.accent }}
              >
                Empezar con {currentTab.label.split(" ")[1]} gratis →
              </a>
            </div>
          </RevealWrapper>
        </div>
      </div>
    </section>
  );
}
