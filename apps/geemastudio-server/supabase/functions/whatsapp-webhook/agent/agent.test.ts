import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  agentOwnsStep,
  isAgentEnabledFor,
  runAgent,
  sanitizeAgentReply,
} from "./agent.ts";
import type { AgentApiResult } from "./anthropic.ts";
import { buildAgentHistory } from "./history.ts";
import {
  AGENT_EMOTIONAL_TOOL_NOTE,
  buildAgentSystem,
  limaNowBlock,
} from "./prompt.ts";
import { AGENT_TOOLS, resolveBookingItems, runAgentTool } from "./tools.ts";
import type { ServiceCatalog } from "../lib/services-catalog.ts";
import type { WabaConfigMap } from "../lib/waba-config.ts";
import { EMOTIONAL_SELLING_CTWA_EXT_LIFT_DEFAULT } from "../lib/emotional-selling.ts";

const cfg = (entries: Record<string, Record<string, unknown>>): WabaConfigMap =>
  new Map(Object.entries(entries));

Deno.test("agent flag: apagado por defecto y con allowlist", () => {
  assertEquals(isAgentEnabledFor(cfg({}), "51999000978"), false);
  assertEquals(
    isAgentEnabledFor(cfg({ agent_enabled: { enabled: true } }), "51999000978"),
    true,
  );
  const withAllow = cfg({
    agent_enabled: { enabled: true },
    agent_phone_allowlist: { phones: ["51999000978"] },
  });
  assertEquals(isAgentEnabledFor(withAllow, "51999000978"), true);
  assertEquals(isAgentEnabledFor(withAllow, "51911111111"), false);
});

Deno.test("agente solo en browsing o sin sesión", () => {
  assertEquals(agentOwnsStep(null), true);
  assertEquals(agentOwnsStep("browsing"), true);
  assertEquals(agentOwnsStep("awaiting_datetime"), false);
  assertEquals(agentOwnsStep("awaiting_deposit_boleta"), false);
});

Deno.test("historial: quita el inbound actual, empieza en user y marca staff", () => {
  const t = (m: number) => new Date(Date.UTC(2026, 9, 8, 15, m)).toISOString();
  const { messages, staffOutInHistory } = buildAgentHistory(
    [
      {
        direction: "in",
        msg_type: "text",
        content: "Hola, cuánto cuesta?",
        created_at: t(5),
      },
      {
        direction: "out",
        msg_type: "text",
        content: "S/50",
        created_at: t(3),
        source: "panel",
      },
      { direction: "in", msg_type: "text", content: "Hola", created_at: t(1) },
      {
        direction: "out",
        msg_type: "text",
        content: "huérfano",
        created_at: t(0),
      },
    ].slice(0, 3),
    "Hola, cuánto cuesta?",
  );
  assertEquals(staffOutInHistory, true);
  assertEquals(messages[0].role, "user");
  assertEquals(messages[messages.length - 1], {
    role: "user",
    content: "Hola, cuánto cuesta?",
  });
  assertStringIncludes(String(messages[1].content), "[Equipo");
});

Deno.test("historial: gap >2h descarta lo anterior", () => {
  const { messages } = buildAgentHistory(
    [
      {
        direction: "in",
        msg_type: "text",
        content: "actual",
        created_at: "2026-10-08T18:00:00Z",
      },
      {
        direction: "out",
        msg_type: "text",
        content: "viejo",
        created_at: "2026-10-08T14:00:00Z",
      },
    ],
    "actual",
  );
  assertEquals(messages.length, 1);
});

Deno.test("limaNowBlock usa la fecha de Lima", () => {
  const block = limaNowBlock(new Date("2026-10-09T03:30:00Z")); // 22:30 del 8 en Lima
  assertStringIncludes(block, "2026-10-08");
});

Deno.test("buildAgentSystem: CTWA inyecta venta emocional + nota de tools", () => {
  const emptyCatalog = {
    services: [],
    packs: [],
    categories: [],
    promotions: [],
    servicesByCategory: new Map(),
    packsByCategory: new Map(),
    servicesById: new Map(),
    packsById: new Map(),
    portfolioIndex: [],
  } as unknown as ServiceCatalog;
  const withCtwa = buildAgentSystem({
    wabaConfig: cfg({}),
    catalog: emptyCatalog,
    clientContext: "CLIENTA: test",
    staffOutInHistory: false,
    isCtwaLead: true,
    now: new Date("2026-10-08T15:00:00Z"),
  });
  const dynamic = withCtwa[withCtwa.length - 1]!.text;
  assertStringIncludes(dynamic, "VENTA EMOCIONAL CTWA");
  assertStringIncludes(dynamic, AGENT_EMOTIONAL_TOOL_NOTE.slice(0, 40));
  assertStringIncludes(
    dynamic,
    EMOTIONAL_SELLING_CTWA_EXT_LIFT_DEFAULT.slice(0, 40),
  );
  const organic = buildAgentSystem({
    wabaConfig: cfg({}),
    catalog: emptyCatalog,
    clientContext: "CLIENTA: test",
    staffOutInHistory: false,
    isCtwaLead: false,
    now: new Date("2026-10-08T15:00:00Z"),
  });
  assertEquals(
    organic[organic.length - 1]!.text.includes("VENTA EMOCIONAL CTWA"),
    false,
  );
});

Deno.test("sanitizeAgentReply bloquea confirmación fabricada y promesa de reembolso", () => {
  assertEquals(
    sanitizeAgentReply("Con gusto, tenemos pack de cejas"),
    "Con gusto, tenemos pack de cejas",
  );
  assertStringIncludes(
    sanitizeAgentReply("Te haremos la devolución de tu adelanto"),
    "equipo",
  );
});

Deno.test("resolveBookingItems expande packs y reporta ids desconocidos", () => {
  const catalog = {
    servicesById: new Map([
      ["s1", { id: "s1", duration: 30 }],
      ["s2", { id: "s2", duration: 45 }],
    ]),
    packsById: new Map([
      ["p1", { id: "p1", service_ids: ["s1", "s2"], slot_minutes: null }],
    ]),
  } as unknown as ServiceCatalog;
  assertEquals(resolveBookingItems(["p1"], catalog), {
    duration: 75,
    serviceIds: ["s1", "s2"],
    unknown: [],
  });
  assertEquals(resolveBookingItems(["s1", "zzz"], catalog).unknown, ["zzz"]);
});

// Stub encadenable de Supabase: cualquier consulta resuelve a "sin filas".
// deno-lint-ignore no-explicit-any
function stubSupabase(): any {
  const result = { data: [], error: null, count: 0 };
  const handler: ProxyHandler<object> = {
    get(_t, prop) {
      if (prop === "then") {
        return (resolve: (v: unknown) => void) => resolve(result);
      }
      return () => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

const emptyCatalog = {
  servicesById: new Map(),
  packsById: new Map(),
  services: [],
  packs: [],
  categories: [],
  promotions: [],
} as unknown as ServiceCatalog;

const runWith = (callApi: () => Promise<AgentApiResult | null>) =>
  runAgent({
    supabase: stubSupabase(),
    phoneNumber: "51999000978",
    contactName: "QA",
    catalog: emptyCatalog,
    wabaConfig: cfg({}),
    messageText: "hola",
    callApi,
  });

Deno.test("runAgent: API caída (2 intentos) devuelve false para caer al dispatch", async () => {
  let calls = 0;
  const handled = await runWith(() => {
    calls++;
    return Promise.resolve(null);
  });
  assertEquals(handled, false);
  assertEquals(calls, 2);
});

Deno.test("runAgent: refusal no envía nada y devuelve false", async () => {
  const handled = await runWith(() =>
    Promise.resolve({
      content: [{ type: "text", text: "no puedo" }],
      stopReason: "refusal",
      inputTokens: 1,
      outputTokens: 1,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
    })
  );
  assertEquals(handled, false);
});

Deno.test("runAgent: respuesta sin texto devuelve false", async () => {
  const handled = await runWith(() =>
    Promise.resolve({
      content: [{ type: "thinking", thinking: "..." }],
      stopReason: "end_turn",
      inputTokens: 1,
      outputTokens: 1,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
    })
  );
  assertEquals(handled, false);
});

function toolCtx() {
  return {
    supabase: stubSupabase(),
    phoneNumber: "51999000978",
    contactName: "QA",
    catalog: emptyCatalog,
    wabaConfig: {} as WabaConfigMap,
    messageText: "hola",
    turnHandled: false,
  };
}

Deno.test("tools: el agente expone carrito, día, equipo y reserva; sin selector viejo", () => {
  const names = AGENT_TOOLS.map((t) => t.name);
  for (
    const n of [
      "ver_carrito",
      "agregar_al_carrito",
      "quitar_del_carrito",
      "consultar_dia",
      "consultar_equipo",
      "reservar_horario",
    ]
  ) assertEquals(names.includes(n), true, n);
  assertEquals(names.includes("pasar_a_agendar"), false);
});

Deno.test("tools: agregar_al_carrito rechaza ids fuera del catálogo", async () => {
  const r = await runAgentTool(
    "agregar_al_carrito",
    { ids: ["nope"] },
    toolCtx(),
  );
  assertEquals(r.isError, true);
  assertStringIncludes(r.content, "nope");
});

Deno.test("tools: consultar_dia valida formato y fechas pasadas", async () => {
  const bad = await runAgentTool(
    "consultar_dia",
    { fecha: "mañana" },
    toolCtx(),
  );
  assertEquals(bad.isError, true);
  const past = await runAgentTool(
    "consultar_dia",
    { fecha: "2020-01-01" },
    toolCtx(),
  );
  assertStringIncludes(past.content, "pasó");
});

Deno.test("tools: reservar_horario valida entrada y no marca turno atendido", async () => {
  const ctx = toolCtx();
  const r = await runAgentTool(
    "reservar_horario",
    { fecha: "x", hora: "y", mensaje: "" },
    ctx,
  );
  assertEquals(r.isError, true);
  assertEquals(ctx.turnHandled, false);
});

Deno.test("tools: tool desconocida devuelve error", async () => {
  const r = await runAgentTool("pasar_a_agendar", {}, toolCtx());
  assertEquals(r.isError, true);
});
