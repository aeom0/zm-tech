"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  { from: "client", text: "Hola, quiero una cita para mañana 💅", delay: 0 },
  {
    from: "bot",
    text: "¡Hola! Tenemos disponibilidad mañana a las 11am, 2pm y 4pm. ¿Cuál te va bien?",
    delay: 900,
  },
  { from: "client", text: "A las 2pm", delay: 1700 },
  {
    from: "bot",
    text: "✅ Cita confirmada para mañana a las 2pm. ¡Te esperamos!",
    delay: 2500,
  },
] as const;

export function WABAPreview() {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    const timers = MESSAGES.map((msg, i) =>
      setTimeout(() => setVisible(i + 1), msg.delay + 400),
    );
    const reset = setTimeout(() => setVisible(0), 5000);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(reset);
    };
  }, [visible]);

  useEffect(() => {
    if (visible === 0) {
      const t = setTimeout(() => setVisible(1), 600);
      return () => clearTimeout(t);
    }
  }, [visible]);

  return (
    <div className="relative bg-[#0B1418] rounded-2xl overflow-hidden border border-white/10 max-w-[280px] mx-auto shadow-2xl">
      {/* Header tipo WA */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#1F2C34] border-b border-white/5">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#E91E8C] to-[#1565C0] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          SP
        </div>
        <div>
          <p className="text-white text-sm font-semibold leading-none">SalonPro Bot</p>
          <p className="text-[#8696A0] text-xs mt-0.5">en línea</p>
        </div>
      </div>

      {/* Mensajes */}
      <div className="p-3 space-y-2 min-h-[180px] flex flex-col justify-end">
        {MESSAGES.map((msg, i) => (
          <div
            key={i}
            className={`transition-all duration-500 ${
              visible > i ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            } flex ${msg.from === "client" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                msg.from === "client"
                  ? "bg-[#025C4C] text-white rounded-br-sm"
                  : "bg-[#1F2C34] text-[#D1D7DB] rounded-bl-sm"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Badge 24/7 */}
      <div className="absolute top-3 right-3">
        <span className="bg-[#25D366] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          24/7
        </span>
      </div>
    </div>
  );
}
