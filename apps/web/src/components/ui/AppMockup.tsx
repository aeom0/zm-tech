"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  DollarSign,
  Users,
  Home,
  Scissors,
  MoreHorizontal,
  User,
  Bell,
  TrendingUp,
  Star,
} from "lucide-react";
import { LUNARIS } from "@/lib/theme";

// Tres pantallas de la app que rotan en loop
const SCREENS = [
  {
    id: "agenda",
    label: "Agenda del día",
    subtitle: "Lunes 24 feb · 6 citas",
    accent: LUNARIS.primary,
    items: [
      {
        name: "María G.",
        service: "Extensiones vol. ruso",
        time: "10:00",
        color: LUNARIS.primary,
        done: true,
      },
      {
        name: "Carla M.",
        service: "Servicio de manos y pies",
        time: "11:30",
        color: "#6A1B9A",
        done: true,
      },
      {
        name: "Sofía R.",
        service: "Lifting + tinte",
        time: "13:00",
        color: "#00695C",
        done: false,
      },
      {
        name: "Andrea P.",
        service: "Color y tratamiento",
        time: "15:00",
        color: "#FFD700",
        done: false,
      },
    ],
    TabIcon: Calendar,
  },
  {
    id: "finanzas",
    label: "Finanzas",
    subtitle: "Febrero 2026",
    accent: "#FFD700",
    items: [
      {
        name: "Ingresos hoy",
        service: "$ 420",
        time: "↑ 12%",
        color: "#00695C",
        done: true,
      },
      {
        name: "Esta semana",
        service: "$ 1,840",
        time: "↑ 8%",
        color: "#00695C",
        done: true,
      },
      {
        name: "Este mes",
        service: "$ 6,240",
        time: "↑ 15%",
        color: "#00695C",
        done: false,
      },
      {
        name: "Comisiones",
        service: "$ 936",
        time: "↓ 3%",
        color: LUNARIS.primary,
        done: false,
      },
    ],
    TabIcon: DollarSign,
  },
  {
    id: "personal",
    label: "Mi equipo",
    subtitle: "4 profesionales activas",
    accent: "#6A1B9A",
    items: [
      {
        name: "Ana",
        service: "3 citas hoy",
        time: "$ 180",
        color: LUNARIS.primary,
        done: true,
      },
      {
        name: "Luis",
        service: "2 citas hoy",
        time: "$ 95",
        color: "#6A1B9A",
        done: true,
      },
      {
        name: "Carla",
        service: "2 citas hoy",
        time: "$ 90",
        color: "#00BCD4",
        done: false,
      },
      {
        name: "Diego",
        service: "1 cita hoy",
        time: "$ 55",
        color: "#FFD700",
        done: false,
      },
    ],
    TabIcon: Users,
  },
];

const TABS = [
  { Icon: Home, id: "home" },
  { Icon: Calendar, id: "agenda" },
  { Icon: Scissors, id: "services" },
  { Icon: MoreHorizontal, id: "more" },
  { Icon: User, id: "profile" },
];

export function AppMockup() {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % SCREENS.length);
        setAnimating(false);
      }, 300);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  const screen = SCREENS[current];

  return (
    <div className="relative max-w-[280px] mx-auto">
      {/* Marco del teléfono */}
      <div className="bg-gradient-to-b from-zinc-700 to-zinc-900 rounded-[2.8rem] p-[3px] shadow-2xl shadow-black/60 ring-1 ring-white/10">
        <div
          className="bg-[#0A0712] rounded-[2.5rem] overflow-hidden"
          style={{ aspectRatio: "9/19" }}
        >
          {/* Status bar */}
          <div className="flex items-center justify-between px-5 pt-3 pb-1 flex-shrink-0">
            <span className="text-white/50 text-[10px] font-medium">9:41</span>
            {/* Notch */}
            <div className="w-16 h-4 bg-black rounded-full" />
            <div className="flex items-center gap-1">
              <div className="flex gap-0.5 items-end h-3">
                {[2, 3, 4, 3].map((h, i) => (
                  <div
                    key={i}
                    className="w-1 bg-white/40 rounded-sm"
                    style={{ height: `${h * 3}px` }}
                  />
                ))}
              </div>
              <div className="w-4 h-2.5 border border-white/40 rounded-sm ml-1 relative">
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full w-0.5 h-1.5 bg-white/40 rounded-r-sm" />
                <div className="h-full w-3/4 bg-white/60 rounded-sm" />
              </div>
            </div>
          </div>

          {/* Contenido animado */}
          <div
            className="px-4 pt-3 pb-2 flex-1"
            style={{
              opacity: animating ? 0 : 1,
              transform: animating ? "translateY(8px)" : "translateY(0)",
              transition: "opacity 0.3s ease, transform 0.3s ease",
            }}
          >
            {/* Header de pantalla */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <div
                  className="flex items-center gap-1 text-xs font-bold mb-0.5"
                  style={{ color: screen.accent }}
                >
                  <Scissors size={11} strokeWidth={2} />
                  <span>SalonPro</span>
                </div>
                <div className="text-white text-sm font-bold">
                  {screen.label}
                </div>
                <div className="text-white/50 text-[10px] mt-0.5">
                  {screen.subtitle}
                </div>
              </div>
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
                style={{ backgroundColor: `${screen.accent}30` }}
              >
                <Bell size={14} strokeWidth={2} />
              </div>
            </div>

            {/* Indicadores de pantalla */}
            <div className="flex gap-1 mb-4 justify-center">
              {SCREENS.map((_, i) => (
                <div
                  key={i}
                  className="h-1 rounded-full transition-all duration-500"
                  style={{
                    width: i === current ? "20px" : "6px",
                    backgroundColor:
                      i === current ? screen.accent : "rgba(255,255,255,0.2)",
                  }}
                />
              ))}
            </div>

            {/* Lista de items */}
            <div className="space-y-2">
              {screen.items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 rounded-xl p-2.5"
                  style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                >
                  {/* Avatar / icono */}
                  <div
                    className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: `${item.color}40` }}
                  >
                    {item.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-[11px] font-semibold truncate">
                      {item.name}
                    </div>
                    <div className="text-white/50 text-[10px] truncate">
                      {item.service}
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex flex-col items-end gap-0.5">
                    <span className="text-[10px] text-white/60">
                      {item.time}
                    </span>
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: item.done
                          ? "#22c55e"
                          : `${screen.accent}80`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom nav */}
          <div
            className="absolute bottom-0 left-0 right-0 border-t flex justify-around items-center py-3 px-2"
            style={{
              backgroundColor: "rgba(10,7,18,0.95)",
              borderColor: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(8px)",
            }}
          >
            {TABS.map(({ Icon, id }, i) => {
              const isActive =
                (i === 1 && screen.id === "agenda") ||
                (i === 0 && screen.id === "finanzas") ||
                (i === 3 && screen.id === "personal");
              return (
                <div key={id} className="flex flex-col items-center gap-0.5">
                  <Icon
                    size={16}
                    strokeWidth={isActive ? 2.5 : 1.75}
                    className={`transition-all ${isActive ? "scale-125" : "opacity-40"}`}
                    color={isActive ? screen.accent : "white"}
                  />
                  {isActive && (
                    <div
                      className="w-1 h-1 rounded-full"
                      style={{ backgroundColor: screen.accent }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Glow dinámico */}
      <div
        className="absolute inset-0 -z-10 scale-75 blur-3xl rounded-full transition-all duration-1000"
        style={{ backgroundColor: `${screen.accent}25` }}
      />

      {/* Etiqueta flotante — notificación */}
      <div
        className="absolute -right-4 top-16 bg-white dark:bg-zinc-900 rounded-2xl px-3 py-2 shadow-xl text-xs font-medium text-zinc-800 dark:text-zinc-200 border border-zinc-100 dark:border-zinc-800 whitespace-nowrap transition-all duration-500"
        style={{ opacity: animating ? 0 : 1 }}
      >
        <span className="inline-flex items-center gap-1.5">
          <Bell size={11} strokeWidth={2} className="text-zinc-500" />
          {screen.id === "agenda" && "Cita en 30 min"}
          {screen.id === "finanzas" && "Ingreso registrado"}
          {screen.id === "personal" && "Comisión calculada"}
        </span>
      </div>

      {/* Etiqueta flotante — métrica */}
      <div
        className="absolute -left-6 bottom-24 bg-white dark:bg-zinc-900 rounded-2xl px-3 py-2 shadow-xl border border-zinc-100 dark:border-zinc-800 whitespace-nowrap transition-all duration-500"
        style={{ opacity: animating ? 0 : 1 }}
      >
        <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
          {screen.id === "agenda" && "Ocupación"}
          {screen.id === "finanzas" && "Vs. mes anterior"}
          {screen.id === "personal" && "Satisfacción"}
        </div>
        <div
          className="text-sm font-bold flex items-center gap-1"
          style={{ color: screen.accent }}
        >
          {screen.id === "agenda" && "87% hoy"}
          {screen.id === "finanzas" && (
            <>
              +15% <TrendingUp size={12} strokeWidth={2.5} />
            </>
          )}
          {screen.id === "personal" && (
            <>
              4.9 <Star size={11} strokeWidth={2} className="fill-current" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
