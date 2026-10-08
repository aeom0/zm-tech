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
  AGENT_INSTRUCTIONS,
  buildAgentSystem,
  limaNowBlock,
} from "./prompt.ts";
import {
  AGENT_TOOLS,
  dayFacts,
  resolveBookingItems,
  runAgentTool,
} from "./tools.ts";
import { hydrateSalonHolidays } from "../lib/peru-holidays.ts";
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
    wabaConfig: new Map() as WabaConfigMap,
    messageText: "hola",
    turnHandled: false,
    sentToClient: false,
  };
}

Deno.test("tools: el agente expone carrito, día, equipo y reserva; sin selector viejo", () => {
  const names = AGENT_TOOLS.map((t) => t.name);
  for (
    const n of [
      "buscar_servicios",
      "info_negocio",
      "ver_guia",
      "ver_portafolio",
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

Deno.test("tools: buscar_servicios filtra por palabras sin acentos y usa categoría", async () => {
  const catalog = {
    ...emptyCatalog,
    categories: [{ id: "c1", name: "Pestañas", order: 1 }],
    services: [
      {
        id: "s1",
        name: "Extensiones 3D",
        short_name: null,
        category_id: "c1",
        subcategory: null,
        price: "120",
        duration: 90,
        is_active: true,
      },
    ],
    packs: [],
    promotions: [],
  } as unknown as ServiceCatalog;
  const ctx = { ...toolCtx(), catalog };
  const hit = await runAgentTool(
    "buscar_servicios",
    { consulta: "pestanas 3d", categoria_id: null },
    ctx,
  );
  assertStringIncludes(hit.content, "[s1]");
  const miss = await runAgentTool(
    "buscar_servicios",
    { consulta: "uñas", categoria_id: null },
    ctx,
  );
  assertStringIncludes(miss.content, "Sin resultados");
  const byCat = await runAgentTool(
    "buscar_servicios",
    { consulta: null, categoria_id: "c1" },
    ctx,
  );
  assertStringIncludes(byCat.content, "[s1]");
});

Deno.test("buscar_servicios y el prompt del agente incluyen promo y pack", async () => {
  const service = {
    id: "s1",
    name: "Extensiones 3D",
    short_name: null,
    category_id: "c1",
    subcategory: null,
    price: "120",
    duration: 90,
    is_active: true,
  };
  const pack = {
    id: "p1",
    title: "Mirada completa",
    short_name: "Mirada",
    category_id: "c1",
    pack_price: "180",
    service_ids: ["s1"],
    is_active: true,
    display_order: 1,
  };
  const catalog = {
    ...emptyCatalog,
    servicesById: new Map([["s1", service]]),
    packsById: new Map([["p1", pack]]),
    servicesByCategory: new Map([["c1", [service]]]),
    packsByCategory: new Map([["c1", [pack]]]),
    services: [service],
    packs: [pack],
    categories: [{ id: "c1", name: "Pestañas", order: 1 }],
    promotions: [
      {
        id: "pr1",
        title: "Set octubre pestañas",
        description: "3D a precio promo",
        emoji: "",
        badge: "15%",
        valid_until: null,
        valid_days: "1,2,3",
        is_active: true,
        display_order: 1,
        items: [
          {
            item_type: "service",
            item_id: "s1",
            quantity: 1,
            discounted_price: "90",
          },
        ],
      },
    ],
  } as unknown as ServiceCatalog;
  const hit = await runAgentTool(
    "buscar_servicios",
    { consulta: "promos", categoria_id: null },
    { ...toolCtx(), catalog },
  );
  assertStringIncludes(hit.content, "Set octubre pestañas");
  assertStringIncludes(hit.content, "S/90");
  assertStringIncludes(hit.content, "[s1]");
  const blocks = buildAgentSystem({
    wabaConfig: cfg({}),
    catalog,
    clientContext: "CLIENTA: test",
    staffOutInHistory: false,
    now: new Date("2026-10-08T15:00:00Z"),
  });
  const appendix = blocks.map((b) => b.text).join("\n");
  assertStringIncludes(appendix, "PROMOCIONES ACTIVAS");
  assertStringIncludes(appendix, "Set octubre pestañas");
  assertStringIncludes(appendix, "promo S/90");
  assertStringIncludes(appendix, "PACKS ESPECIALES");
  assertStringIncludes(appendix, "[p1]");
  assertStringIncludes(appendix, "Mirada");
  const packs = await runAgentTool(
    "buscar_servicios",
    { consulta: "packs", categoria_id: null },
    { ...toolCtx(), catalog },
  );
  assertStringIncludes(packs.content, "[p1]");
  assertStringIncludes(packs.content, "Mirada completa");
  assertStringIncludes(packs.content, "S/180");
  assertEquals(packs.content.includes("Extensiones 3D"), false);
});

// Stub por tabla: cualquier cadena resuelve a las filas de esa tabla.
// deno-lint-ignore no-explicit-any
function tableStub(tables: Record<string, unknown[]>): any {
  return {
    from(table: string) {
      const chain: Record<string, unknown> = {};
      const self = new Proxy(chain, {
        get(_t, prop) {
          if (prop === "then") {
            return (resolve: (v: unknown) => void) =>
              resolve({ data: tables[table] ?? [], error: null });
          }
          return () => self;
        },
      });
      return self;
    },
  };
}

Deno.test("dayFacts: feriado, domingo, ausencia parcial y cobertura", async () => {
  hydrateSalonHolidays([
    {
      date: "2031-03-04",
      is_closed: false,
      open_until_hour: 14,
      name: "Feriado QA",
    },
    {
      date: "2031-03-05",
      is_closed: true,
      open_until_hour: null,
      name: "Cierre QA",
    },
  ]);
  const ctx = {
    ...toolCtx(),
    supabase: tableStub({
      employees: [{ id: "e1", name: "Ana" }, { id: "e2", name: "Luz" }],
      employee_time_off: [
        {
          employee_id: "e1",
          kind: "sick_leave",
          date_from: "2031-03-01",
          date_to: "2031-03-10",
          start_time: null,
          end_time: null,
        },
        {
          employee_id: "e2",
          kind: "permission",
          date_from: "2031-03-04",
          date_to: "2031-03-04",
          start_time: "14:00:00",
          end_time: "16:00:00",
        },
        {
          employee_id: "e2",
          kind: "vacation",
          date_from: "2031-02-01",
          date_to: "2031-02-10",
          start_time: null,
          end_time: null,
        },
      ],
      employee_coverages: [
        { covered_employee_id: "e1", covering_employee_id: "e2" },
      ],
    }),
  };
  const facts = (await dayFacts(ctx, "2031-03-04")).join("\n");
  assertStringIncludes(facts, "Feriado");
  assertStringIncludes(facts, "14:00");
  assertStringIncludes(facts, "Ana todo el día");
  assertStringIncludes(facts, "Luz de 14:00 a 16:00");
  assertStringIncludes(facts, "Luz cubre a Ana");
  assertEquals(facts.includes("vacation"), false);
  // 2031-03-09 es domingo: adelanto 20%
  const dom = (await dayFacts(ctx, "2031-03-09")).join("\n");
  assertStringIncludes(dom, "adelanto");
});

Deno.test("tools: día cerrado se informa y reservar_horario lo rechaza", async () => {
  hydrateSalonHolidays([
    {
      date: "2031-03-05",
      is_closed: true,
      open_until_hour: null,
      name: "Cierre QA",
    },
  ]);
  const ctx = toolCtx();
  const dia = await runAgentTool("consultar_dia", { fecha: "2031-03-05" }, ctx);
  assertEquals(dia.isError ?? false, false);
  assertStringIncludes(dia.content, "2031-03-05");
  const res = await runAgentTool(
    "reservar_horario",
    { fecha: "2031-03-05", hora: "11:00", mensaje: "ok" },
    ctx,
  );
  assertEquals(res.isError, true);
  assertEquals(ctx.turnHandled, false);
});

Deno.test("tools: info_negocio entrega datos oficiales", async () => {
  const ub = await runAgentTool(
    "info_negocio",
    { tema: "ubicacion" },
    toolCtx(),
  );
  assertStringIncludes(ub.content, "Artesanos");
  const pol = await runAgentTool(
    "info_negocio",
    { tema: "politicas" },
    toolCtx(),
  );
  assertStringIncludes(pol.content, "Cancelación");
  const bad = await runAgentTool("info_negocio", { tema: "x" }, toolCtx());
  assertEquals(bad.isError, true);
});

Deno.test("tools: info_negocio prefiere waba_config.ubicacion_text", async () => {
  const ctx = {
    ...toolCtx(),
    wabaConfig: cfg({ ubicacion_text: { text: "Sede Nueva 123" } }),
  };
  const ub = await runAgentTool("info_negocio", { tema: "ubicacion" }, ctx);
  assertStringIncludes(ub.content, "Sede Nueva 123");
});

Deno.test("tools: ver_guia sin imagen configurada devuelve error", async () => {
  const r = await runAgentTool("ver_guia", { guia: "fiber_3d" }, toolCtx());
  assertEquals(r.isError, true);
  assertEquals(toolCtx().sentToClient, false);
});

Deno.test("prompt: no menciona herramientas inexistentes", () => {
  assertEquals(AGENT_INSTRUCTIONS.includes("consultar_horarios"), false);
  const names = new Set(AGENT_TOOLS.map((t) => t.name));
  for (const m of AGENT_INSTRUCTIONS.matchAll(/\b([a-z]+_[a-z_]+)\b/g)) {
    const w = m[1];
    if (
      /^(ver|buscar|agregar|quitar|consultar|reservar|escalar|info)_/.test(w)
    ) {
      assertEquals(names.has(w), true, w);
    }
  }
});
