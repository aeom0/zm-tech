// prompt.ts — System prompt del agente (bloques con prompt caching 1 h)

import type { ServiceCatalog } from "../lib/services-catalog.ts";
import type { WabaConfigMap } from "../lib/waba-config.ts";
import { resolveChatSystemPromptBase } from "../lib/waba-config.ts";
import {
  buildCatalogAppendix,
  buildLanguageInstruction,
} from "../lib/haiku-prompt.ts";
import type { AgentSystemBlock } from "./anthropic.ts";

export const AGENT_INSTRUCTIONS = `MODO AGENTE (WhatsApp):
- Responde en texto plano, breve y cálido, como persona del equipo. Sin XML ni etiquetas.
- Dispones de herramientas. Los horarios, precios y citas SOLO los das con lo que devuelvan las herramientas o el catálogo de arriba; nunca los inventes.
- Antes de decir que hay (o no hay) cupo, llama a consultar_horarios con el día y los ids del catálogo.
- Cuando la clienta ya eligió qué reservar, usa pasar_a_agendar (ella elige día y hora en el selector) y no escribas nada más en ese turno.
- Nunca digas que una cita quedó confirmada: la cita solo existe cuando el sistema la registra tras el adelanto.
- Reclamos, devoluciones, cancelar con adelanto, asesoría personal o algo que no puedas resolver: escalar_a_humano.
- Si la clienta responde con una sola palabra de cortesía, contesta natural; no repitas información ya dada.`;

/** Fecha real de Lima, siempre en el bloque dinámico (sin caché). */
export function limaNowBlock(now = new Date()): string {
  const fmt = new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  const key = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" })
    .format(now);
  return `AHORA (Lima): ${fmt}. Fecha ISO de hoy: ${key}. Usa solo esta fecha como referencia para "hoy", "mañana" y días de la semana.`;
}

export function buildAgentSystem(opts: {
  wabaConfig: WabaConfigMap;
  catalog: ServiceCatalog;
  phoneCountry?: string | null;
  clientContext: string;
  staffOutInHistory: boolean;
  now?: Date;
}): AgentSystemBlock[] {
  const blocks: AgentSystemBlock[] = [];
  const language = buildLanguageInstruction(opts.phoneCountry);
  if (language) blocks.push({ type: "text", text: language });
  blocks.push({
    type: "text",
    text: [
      resolveChatSystemPromptBase(opts.wabaConfig).trim(),
      AGENT_INSTRUCTIONS,
    ]
      .join("\n\n"),
    cache_control: { type: "ephemeral", ttl: "1h" },
  });
  const appendix = buildCatalogAppendix(opts.catalog);
  if (appendix) {
    blocks.push({
      type: "text",
      text: appendix,
      cache_control: { type: "ephemeral", ttl: "1h" },
    });
  }
  const dynamic = [limaNowBlock(opts.now), opts.clientContext.trim()];
  if (opts.staffOutInHistory) {
    dynamic.push(
      "CONTEXTO STAFF: el equipo humano escribió en este hilo (mensajes marcados [Equipo — mensaje del staff]). No contradigas lo que dijo el equipo y continúa desde ahí.",
    );
  }
  blocks.push({ type: "text", text: dynamic.filter(Boolean).join("\n\n") });
  return blocks;
}
