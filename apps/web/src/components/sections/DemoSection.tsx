"use client";

import { useState } from "react";
import {
  Calendar,
  DollarSign,
  Users,
  Package,
  MessageCircle,
  Bell,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Home,
  Sparkles,
  MoreHorizontal,
  User,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { RevealWrapper } from "@/components/ui/RevealWrapper";
import { LUNARIS } from "@/lib/theme";
import { DemoBusinessPicker } from "@/components/ui/DemoBusinessPicker";

const DEMO_TABS: {
  id: string;
  label: string;
  icon: LucideIcon;
  title: string;
  description: string;
  accent: string;
  stats: { value: string; label: string }[];
}[] = [
  {
    id: "agenda",
    label: "Agenda",
    icon: Calendar,
    title: "Citas sin caos",
    description:
      "Vista diaria por profesional. Toca para ver detalles, arrastra para reprogramar. Sin conflictos, sin doble-reservas.",
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
      "Ingresos por día, semana y mes. Comisiones calculadas automáticamente. Cierra el mes en segundos, sin Excel.",
    accent: "#F59E0B",
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
      "Perfiles por profesional con citas del día, ingresos generados y modo de pago. Cada uno ve solo lo suyo.",
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
      "Alertas automáticas de stock bajo. Registro de uso por servicio. Deja de perder dinero por falta de control.",
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
      "El bot atiende a tus clientes 24/7: responde, muestra el catálogo, toma la cita y envía confirmación con IA.",
    accent: "#25D366",
    stats: [
      { value: "24/7", label: "Disponible sin intervención humana" },
      { value: "−60%", label: "Citas perdidas por falta de respuesta" },
    ],
  },
];

// ── Pantalla compartida: status bar + wordmark header ──────────────────────
function PhoneShell({
  accent,
  children,
  headerRight,
  title,
  subtitle,
}: {
  accent: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div
      className="relative w-full max-w-[300px] mx-auto flex flex-col overflow-hidden shadow-2xl border border-white/10"
      style={{ backgroundColor: "#0E0E1A", minHeight: 480, borderRadius: 28 }}
    >
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1 flex-shrink-0">
        <span className="text-white/40 text-[10px] font-medium">9:41</span>
        <div className="w-12 h-3 bg-black rounded-full" />
        <div className="flex items-center gap-1">
          <div className="flex gap-px items-end h-2.5">
            {[2, 3, 4, 3].map((h, i) => (
              <div
                key={i}
                className="w-0.5 bg-white/40 rounded-sm"
                style={{ height: `${h * 2.5}px` }}
              />
            ))}
          </div>
          <div className="w-3.5 h-2 border border-white/40 rounded-sm ml-1 relative">
            <div className="h-full w-3/4 bg-white/60 rounded-sm" />
          </div>
        </div>
      </div>

      {/* App header */}
      <div
        className="flex items-center justify-between px-4 py-2 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div>
          <div className="flex items-center gap-1 mb-0.5">
            <Image
              src="/logo-diamondSparkle.svg"
              alt=""
              width={10}
              height={12}
              className="h-2.5 w-auto"
            />
            <span className="text-[9px] font-bold">
              <span className="text-white/50">Geema</span>
              <span
                style={{
                  background: LUNARIS.gradient.css90,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Studio
              </span>
            </span>
          </div>
          <p className="text-white text-[13px] font-bold leading-tight">{title}</p>
          <p className="text-white/40 text-[9px] mt-0.5">{subtitle}</p>
        </div>
        {headerRight ?? (
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${accent}20` }}
          >
            <Bell size={12} strokeWidth={2} color={accent} />
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden">{children}</div>

      {/* Bottom tab bar */}
      <div
        className="flex justify-around items-center py-2 px-2 flex-shrink-0"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.07)",
          backgroundColor: "rgba(14,14,26,0.97)",
        }}
      >
        {(
          [
            { Icon: Home, id: "home" },
            { Icon: Calendar, id: "agenda", active: true },
            { Icon: Sparkles, id: "services" },
            { Icon: MoreHorizontal, id: "more" },
            { Icon: User, id: "profile" },
          ] as { Icon: LucideIcon; id: string; active?: boolean }[]
        ).map(({ Icon, id, active }) => (
          <div key={id} className="flex flex-col items-center gap-0.5">
            <Icon
              size={14}
              strokeWidth={active ? 2.5 : 1.75}
              color={active ? accent : "rgba(255,255,255,0.35)"}
            />
            {active && (
              <div
                className="w-1 h-1 rounded-full"
                style={{ backgroundColor: accent }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Glow de acento en la base */}
      <div
        className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 100%, ${accent}20 0%, transparent 70%)`,
        }}
      />
    </div>
  );
}

// ── Agenda ─────────────────────────────────────────────────────────────────
function AgendaMockup({ accent }: { accent: string }) {
  const days = ["L", "M", "X", "J", "V", "S", "D"];
  const selectedDay = 3; // jueves
  const appointments = [
    { time: "10:00", client: "María G.", service: "Vol. ruso", color: accent, status: "done" },
    { time: "11:30", client: "Carla M.", service: "Manos y pies", color: "#6A1B9A", status: "done" },
    { time: "13:00", client: "Sofía R.", service: "Lifting + tinte", color: "#E91E8C", status: "next" },
    { time: "15:00", client: "Andrea P.", service: "Color y tratam.", color: "#F59E0B", status: "pending" },
  ];

  return (
    <PhoneShell
      accent={accent}
      title="Agenda"
      subtitle="Jueves 3 de abril · 6 citas"
      headerRight={
        <div className="flex items-center gap-1">
          <ChevronLeft size={12} color="rgba(255,255,255,0.4)" />
          <span className="text-white/40 text-[9px]">Abr</span>
          <ChevronRight size={12} color="rgba(255,255,255,0.4)" />
        </div>
      }
    >
      <div className="px-3 pt-2 space-y-2">
        {/* Selector de días */}
        <div className="flex gap-1 justify-between">
          {days.map((d, i) => (
            <div
              key={d}
              className="flex flex-col items-center gap-0.5 flex-1"
            >
              <span className="text-white/30 text-[8px]">{d}</span>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold"
                style={
                  i === selectedDay
                    ? { background: accent, color: "#000" }
                    : { color: "rgba(255,255,255,0.5)" }
                }
              >
                {i + 1}
              </div>
            </div>
          ))}
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          {[
            { label: "Citas", value: "6", icon: Clock, color: accent },
            { label: "Listas", value: "2", icon: CheckCircle, color: "#22c55e" },
            { label: "Sin asig.", value: "1", icon: AlertTriangle, color: "#F59E0B" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="rounded-xl p-1.5 flex flex-col items-center gap-0.5"
              style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
            >
              <Icon size={10} color={color} strokeWidth={2} />
              <span className="text-white text-[11px] font-bold">{value}</span>
              <span style={{ color }} className="text-[8px] font-medium">{label}</span>
            </div>
          ))}
        </div>

        {/* Lista de citas */}
        <div className="space-y-1.5 pt-0.5">
          {appointments.map((apt) => (
            <div
              key={apt.time}
              className="flex items-center gap-2 rounded-xl px-2.5 py-2"
              style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
            >
              <div
                className="w-0.5 self-stretch rounded-full flex-shrink-0"
                style={{ backgroundColor: apt.color }}
              />
              <span
                className="text-[10px] font-bold w-8 flex-shrink-0"
                style={{ color: apt.color }}
              >
                {apt.time}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-[10px] font-semibold truncate">{apt.client}</p>
                <p className="text-white/40 text-[8px] truncate">{apt.service}</p>
              </div>
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor:
                    apt.status === "done"
                      ? "#22c55e"
                      : apt.status === "next"
                        ? accent
                        : "rgba(255,255,255,0.2)",
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}

// ── Finanzas ───────────────────────────────────────────────────────────────
function FinanzasMockup({ accent }: { accent: string }) {
  const bars = [40, 65, 55, 80, 70, 95, 75];
  const days = ["L", "M", "X", "J", "V", "S", "D"];
  const payments = [
    { client: "María G.", amount: "$ 85", method: "Efectivo", color: "#22c55e" },
    { client: "Carla M.", amount: "$ 120", method: "Tarjeta", color: LUNARIS.primaryMid },
    { client: "Sofía R.", amount: "$ 65", method: "Efectivo", color: "#22c55e" },
  ];

  return (
    <PhoneShell accent={accent} title="Finanzas" subtitle="Abril 2026">
      <div className="px-3 pt-2 space-y-2">
        {/* Selector período */}
        <div
          className="flex rounded-xl overflow-hidden border"
          style={{ borderColor: "rgba(255,255,255,0.1)" }}
        >
          {["Hoy", "Semana", "Mes"].map((p, i) => (
            <div
              key={p}
              className="flex-1 text-center py-1.5 text-[9px] font-semibold"
              style={
                i === 2
                  ? { backgroundColor: accent, color: "#000" }
                  : { color: "rgba(255,255,255,0.4)" }
              }
            >
              {p}
            </div>
          ))}
        </div>

        {/* Ingreso principal */}
        <div
          className="rounded-2xl p-3 text-center"
          style={{ backgroundColor: "rgba(255,255,255,0.05)", border: `1px solid ${accent}30` }}
        >
          <p className="text-white/40 text-[9px] mb-0.5">Ingresos este mes</p>
          <p className="font-bold text-2xl" style={{ color: accent }}>
            $ 6,240
          </p>
          <div className="flex items-center justify-center gap-1 mt-0.5">
            <TrendingUp size={9} color="#22c55e" strokeWidth={2.5} />
            <span className="text-[9px] text-green-400 font-semibold">+15% vs. mes anterior</span>
          </div>
        </div>

        {/* Mini gráfico de barras */}
        <div
          className="rounded-xl p-2.5"
          style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
        >
          <p className="text-white/40 text-[8px] mb-2">Ingresos últimos 7 días</p>
          <div className="flex items-end gap-1 h-10">
            {bars.map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className="w-full rounded-sm"
                  style={{
                    height: `${h}%`,
                    backgroundColor: i === 5 ? accent : `${accent}40`,
                  }}
                />
                <span className="text-white/25 text-[7px]">{days[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Últimos pagos */}
        <div className="space-y-1">
          <p className="text-white/30 text-[8px] font-semibold uppercase tracking-wider">Últimos pagos</p>
          {payments.map((p) => (
            <div
              key={p.client}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5"
              style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
            >
              <div
                className="w-5 h-5 rounded-lg flex items-center justify-center text-[8px] font-bold text-black flex-shrink-0"
                style={{ backgroundColor: accent }}
              >
                {p.client[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-[9px] font-semibold truncate">{p.client}</p>
              </div>
              <span className="text-[9px] font-bold" style={{ color: accent }}>{p.amount}</span>
              <span
                className="text-[8px] px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: `${p.color}20`, color: p.color }}
              >
                {p.method}
              </span>
            </div>
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}

// ── Personal ───────────────────────────────────────────────────────────────
function PersonalMockup({ accent }: { accent: string }) {
  const staff = [
    { name: "Ana Torres", role: "Estilista", citas: 3, ingreso: "$ 180", color: accent, initials: "AT" },
    { name: "Luis Mora", role: "Colorista", citas: 2, ingreso: "$ 95", color: "#6A1B9A", initials: "LM" },
    { name: "Carla Vega", role: "Manicurista", citas: 2, ingreso: "$ 90", color: "#00BCD4", initials: "CV" },
    { name: "Diego Ruiz", role: "Estilista", citas: 1, ingreso: "$ 55", color: "#F59E0B", initials: "DR" },
  ];

  return (
    <PhoneShell accent={accent} title="Profesionales" subtitle="4 activos hoy">
      <div className="px-3 pt-2 space-y-1.5">
        {/* KPI resumen */}
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: "Citas hoy", value: "8", color: accent },
            { label: "Ingresos", value: "$ 420", color: "#F59E0B" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="rounded-xl p-2 text-center"
              style={{ backgroundColor: `${color}12`, border: `1px solid ${color}25` }}
            >
              <p className="font-bold text-sm" style={{ color }}>{value}</p>
              <p className="text-white/40 text-[8px] mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Cards de staff */}
        {staff.map((s) => (
          <div
            key={s.name}
            className="flex items-center gap-2.5 rounded-xl px-2.5 py-2"
            style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
              style={{ backgroundColor: `${s.color}50` }}
            >
              {s.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-[10px] font-semibold truncate">{s.name}</p>
              <p className="text-white/40 text-[8px]">{s.role}</p>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[9px] font-bold" style={{ color: s.color }}>{s.ingreso}</span>
              <span className="text-white/30 text-[8px]">{s.citas} citas</span>
            </div>
          </div>
        ))}
      </div>
    </PhoneShell>
  );
}

// ── Inventario ─────────────────────────────────────────────────────────────
function InventarioMockup({ accent }: { accent: string }) {
  const tabs = ["Uñas", "Pestañas", "Insumos"];
  const items = [
    { name: "Gel UV Rosa Nude", unit: "und", qty: 3, min: 5, lowStock: true },
    { name: "Acetona Premium", unit: "litros", qty: 12, min: 3, lowStock: false },
    { name: "Limas de uña", unit: "paq.", qty: 2, min: 4, lowStock: true },
    { name: "Top coat brillante", unit: "und", qty: 8, min: 2, lowStock: false },
  ];

  return (
    <PhoneShell accent={accent} title="Inventario" subtitle="2 productos con stock bajo">
      <div className="px-3 pt-2 space-y-2">
        {/* Tabs de categoría */}
        <div className="flex gap-1">
          {tabs.map((t, i) => (
            <div
              key={t}
              className="px-2.5 py-1 rounded-full text-[8px] font-semibold"
              style={
                i === 0
                  ? { backgroundColor: accent, color: "#000" }
                  : { backgroundColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }
              }
            >
              {t}
            </div>
          ))}
        </div>

        {/* Alerta stock bajo */}
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ backgroundColor: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)" }}
        >
          <AlertTriangle size={11} color="#F59E0B" strokeWidth={2} />
          <span className="text-[9px] font-semibold text-yellow-400">2 productos bajo mínimo</span>
        </div>

        {/* Items de inventario */}
        <div className="space-y-1.5">
          {items.map((item) => (
            <div
              key={item.name}
              className="flex items-center gap-2 rounded-xl px-2.5 py-2"
              style={{
                backgroundColor: "rgba(255,255,255,0.04)",
                border: item.lowStock
                  ? "1px solid rgba(245,158,11,0.35)"
                  : "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-white text-[9px] font-semibold truncate">{item.name}</p>
                  {item.lowStock && (
                    <AlertTriangle size={8} color="#F59E0B" strokeWidth={2.5} />
                  )}
                </div>
                <p className="text-white/30 text-[8px]">{item.unit} · mín. {item.min}</p>
              </div>
              {/* Controles de cantidad */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center"
                  style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
                >
                  <Minus size={8} color="rgba(255,255,255,0.6)" strokeWidth={2.5} />
                </div>
                <span
                  className="text-[11px] font-bold w-5 text-center"
                  style={{ color: item.lowStock ? "#F59E0B" : "white" }}
                >
                  {item.qty}
                </span>
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center"
                  style={{ backgroundColor: `${accent}25` }}
                >
                  <Plus size={8} color={accent} strokeWidth={2.5} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}

// ── WhatsApp ───────────────────────────────────────────────────────────────
function WhatsAppMockup({ accent }: { accent: string }) {
  const messages = [
    { from: "client", text: "Hola! Quiero reservar para mañana 💅" },
    { from: "bot", text: "¡Hola! Soy el asistente de Nail & Glow. ¿A qué hora prefieres?" },
    { from: "client", text: "A las 11am si es posible" },
    { from: "bot", text: "✅ Listo, Sofía. Cita confirmada para mañana 11:00 am — Manicure completa. Te mando recordatorio 1h antes." },
  ];

  return (
    <PhoneShell accent={accent} title="Bot WhatsApp" subtitle="Respuestas automáticas 24/7">
      <div className="flex flex-col h-full px-2 pt-1 pb-2">
        {/* Header estilo WABA */}
        <div
          className="flex items-center gap-2 rounded-xl px-2.5 py-2 mb-2"
          style={{ backgroundColor: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.2)" }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}
          >
            <MessageCircle size={12} color="white" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-[9px] font-bold">Nail &amp; Glow Spa</p>
            <p className="text-green-400 text-[8px]">● En línea · bot activo</p>
          </div>
          <span
            className="text-[7px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: "#25D36630", color: "#25D366" }}
          >
            24/7
          </span>
        </div>

        {/* Chat */}
        <div className="flex-1 space-y-2 overflow-hidden">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.from === "client" ? "justify-end" : "justify-start"}`}
            >
              <div
                className="max-w-[80%] rounded-2xl px-2.5 py-1.5"
                style={{
                  backgroundColor:
                    msg.from === "client"
                      ? "rgba(255,255,255,0.12)"
                      : "rgba(37,211,102,0.15)",
                  border:
                    msg.from === "bot"
                      ? "1px solid rgba(37,211,102,0.25)"
                      : "none",
                }}
              >
                <p className="text-white text-[9px] leading-relaxed">{msg.text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Input simulado */}
        <div
          className="flex items-center gap-2 rounded-full px-3 py-1.5 mt-2"
          style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <span className="text-white/20 text-[9px] flex-1">Escribe un mensaje…</span>
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: accent }}
          >
            <svg width="8" height="8" viewBox="0 0 24 24" fill="white">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}

// ── Dispatcher ─────────────────────────────────────────────────────────────
function DemoMockup({ tab }: { tab: (typeof DEMO_TABS)[0] }) {
  switch (tab.id) {
    case "agenda":
      return <AgendaMockup accent={tab.accent} />;
    case "finanzas":
      return <FinanzasMockup accent={tab.accent} />;
    case "personal":
      return <PersonalMockup accent={tab.accent} />;
    case "inventario":
      return <InventarioMockup accent={tab.accent} />;
    case "whatsapp":
      return <WhatsAppMockup accent={tab.accent} />;
    default:
      return null;
  }
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
              Toca cada módulo y ve cómo funciona GeemaStudio en un celular
              real.
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
