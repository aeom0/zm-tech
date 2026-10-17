// agent.ts — Agente de soporte de GeemaStudio (plan-agente-soporte-zmtech.md, F1).
//
// Ciclo corto sobre callMessagesApi: Haiku decide, el código ejecuta.
// F1 = nivel 1 (guía) + escalamiento. Sin identidad verificada todavía:
// el agente no ve ninguna cuenta y el tenant nunca sale del modelo.

import {
  type AgentApiResult,
  type AgentContentBlock,
  type AgentMessage,
  type AgentSystemBlock,
  type AgentToolDef,
  type AgentToolResultBlock,
  type AgentToolUseBlock,
} from "../_shared/agent/anthropic.ts";
import {
  GUIA_AYUDA,
  GUIA_CATEGORIAS,
  type GuiaCategoria,
} from "../_shared/guia-ayuda.ts";
import type { SupportHoursStatus } from "./hours.ts";

const MAX_TOOL_ROUNDS = 4;

export const ESCALATION_CATEGORIES = ["error", "cobro", "cuenta", "otro"] as const;
export type EscalationCategory = typeof ESCALATION_CATEGORIES[number];

const SUPPORT_SYSTEM_PROMPT = `Eres el asistente de soporte de GeemaStudio, la plataforma de ZM Tech para salones de belleza (panel web, app y asistente de WhatsApp). Te escriben dueñas, dueños y personal de los salones que usan GeemaStudio.

Cómo escribes:
- Español latinoamericano neutro, trato de tú, sin voseo.
- Mensajes cortos de WhatsApp: pocas líneas, *negritas* con un asterisco, listas con guion. Sin títulos, tablas ni enlaces inventados.

Qué haces:
- Para dudas de uso de la plataforma, consulta ver_guia antes de responder y responde solo con lo que dice la guía. Si la guía no lo cubre, no inventes pasos, pantallas ni funciones: dilo y ofrece registrar el caso.
- No tienes acceso a ninguna cuenta: no ves citas, pagos, configuración ni datos de ningún salón. No digas que revisaste algo. Nunca pidas contraseñas ni códigos.
- Usa escalar_a_humano para: errores o fallas de la plataforma, cobros, pagos, reembolsos, cambios de plan, borrar datos o la cuenta, problemas de acceso a una cuenta, cuando la persona pide hablar con alguien, o cuando tu respuesta no le resolvió. Antes de escalar una falla pide solo lo que falte: qué intentaba hacer, qué vio (mensaje de error) y si fue en la web o en la app. No repitas preguntas ya respondidas.
- Al escalar, escribe un resumen claro para la persona del equipo. Después dale al usuario el número de caso y el aviso de horario que devuelve la herramienta, sin cambiarlo.
- Nunca prometas plazos, montos, devoluciones ni que algo quedará resuelto.
- Si quien escribe es clienta de un salón y quiere reservar o preguntar por servicios, explícale con amabilidad que este es el soporte de la plataforma y que escriba al WhatsApp de su salón.
- No hables de otros salones ni de otros clientes de GeemaStudio.`;

export const SUPPORT_TOOLS: AgentToolDef[] = [
  {
    name: "ver_guia",
    description:
      "Lee la guía oficial de uso de GeemaStudio (la misma del Centro de Ayuda del panel). Úsala antes de responder cualquier duda de uso. Devuelve preguntas y respuestas de la categoría pedida.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        categoria: {
          type: "string",
          enum: [...GUIA_CATEGORIAS.map((c) => c.id), "todas"],
          description: "Categoría de la guía, o 'todas' si no está claro.",
        },
      },
      required: ["categoria"],
      additionalProperties: false,
    },
  },
  {
    name: "escalar_a_humano",
    description:
      "Registra el caso para que una persona del equipo de ZM Tech lo atienda. Devuelve el número de caso y el aviso de horario que hay que darle al usuario.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        resumen: {
          type: "string",
          description:
            "Resumen para el equipo: qué pasa, qué intentaba hacer, qué vio y dónde (web o app), en 1 a 4 frases.",
        },
        categoria: {
          type: "string",
          enum: [...ESCALATION_CATEGORIES],
          description:
            "error = falla de la plataforma; cobro = pagos, plan o reembolsos; cuenta = acceso o datos de la cuenta; otro = lo demás.",
        },
        urgente: {
          type: "boolean",
          description:
            "true si el salón no puede operar (no puede agendar, cobrar o el asistente de WhatsApp no responde).",
        },
      },
      required: ["resumen", "categoria", "urgente"],
      additionalProperties: false,
    },
  },
];

export function buildSystem(opts: {
  hours: SupportHoursStatus;
  contactName: string | null;
}): AgentSystemBlock[] {
  const context = [
    `Hora actual en Venezuela: ${opts.hours.localTime}.`,
    opts.hours.open
      ? "El equipo humano está en horario de atención (8:00 a 20:00, hora de Venezuela)."
      : "El equipo humano está fuera de horario (atiende de 8:00 a 20:00, hora de Venezuela).",
    opts.contactName
      ? `Nombre de perfil de WhatsApp de quien escribe: ${opts.contactName} (puede no ser su nombre real).`
      : "",
  ].filter(Boolean).join("\n");
  return [
    {
      type: "text",
      text: SUPPORT_SYSTEM_PROMPT,
      cache_control: { type: "ephemeral" },
    },
    { type: "text", text: context },
  ];
}

export function formatGuia(categoria: string): string {
  const items = categoria === "todas"
    ? GUIA_AYUDA
    : GUIA_AYUDA.filter((i) => i.category === (categoria as GuiaCategoria));
  if (items.length === 0) return "La guía no tiene entradas para esa categoría.";
  return items
    .map((i) =>
      [
        `P: ${i.question}`,
        `R: ${i.answer}`,
        i.link ? `En el panel: ${i.link.label} (${i.link.href})` : "",
      ].filter(Boolean).join("\n")
    )
    .join("\n\n");
}

export interface EscalationInput {
  resumen: string;
  categoria: EscalationCategory;
  urgente: boolean;
}

export interface SupportToolHandlers {
  /** Crea/actualiza el ticket y devuelve el texto para el modelo. */
  escalate: (input: EscalationInput) => Promise<string>;
}

async function runTool(
  block: AgentToolUseBlock,
  handlers: SupportToolHandlers,
): Promise<AgentToolResultBlock> {
  try {
    if (block.name === "ver_guia") {
      return {
        type: "tool_result",
        tool_use_id: block.id,
        content: formatGuia(String(block.input.categoria ?? "todas")),
      };
    }
    if (block.name === "escalar_a_humano") {
      const categoria = ESCALATION_CATEGORIES.includes(
          block.input.categoria as EscalationCategory,
        )
        ? (block.input.categoria as EscalationCategory)
        : "otro";
      const content = await handlers.escalate({
        resumen: String(block.input.resumen ?? "").trim().slice(0, 2000),
        categoria,
        urgente: block.input.urgente === true,
      });
      return { type: "tool_result", tool_use_id: block.id, content };
    }
    return {
      type: "tool_result",
      tool_use_id: block.id,
      content: `Herramienta desconocida: ${block.name}`,
      is_error: true,
    };
  } catch (err) {
    console.error("[SUPPORT] tool", block.name, err);
    return {
      type: "tool_result",
      tool_use_id: block.id,
      content: "La herramienta falló. Dile al usuario que no se pudo registrar y que intente de nuevo en unos minutos.",
      is_error: true,
    };
  }
}

export interface SupportAgentResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Corre el ciclo del agente. Devuelve null si la API falla o no hay texto
 * final; el caller reintenta y luego degrada (nunca deja al usuario sin respuesta).
 */
export async function runSupportAgent(opts: {
  system: AgentSystemBlock[];
  history: AgentMessage[];
  handlers: SupportToolHandlers;
  call: (messages: AgentMessage[]) => Promise<AgentApiResult | null>;
}): Promise<SupportAgentResult | null> {
  const messages: AgentMessage[] = [...opts.history];
  let inputTokens = 0;
  let outputTokens = 0;
  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const res = await opts.call(messages);
    if (!res) return null;
    inputTokens += res.inputTokens + res.cacheCreationInputTokens +
      res.cacheReadInputTokens;
    outputTokens += res.outputTokens;

    const toolUses = res.content.filter(
      (b): b is AgentToolUseBlock => b.type === "tool_use",
    );
    if (res.stopReason === "tool_use" && toolUses.length > 0) {
      if (round === MAX_TOOL_ROUNDS) break;
      messages.push({ role: "assistant", content: res.content });
      const results: AgentToolResultBlock[] = [];
      for (const block of toolUses) results.push(await runTool(block, opts.handlers));
      messages.push({ role: "user", content: results });
      continue;
    }

    const text = res.content
      .filter((b: AgentContentBlock) => b.type === "text")
      .map((b) => String((b as { text: string }).text ?? ""))
      .join("\n")
      .trim();
    return text ? { text, inputTokens, outputTokens } : null;
  }
  console.warn("[SUPPORT] agente agotó las rondas de herramientas");
  return null;
}
