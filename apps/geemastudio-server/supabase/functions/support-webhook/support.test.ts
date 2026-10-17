import { assertEquals, assertStringIncludes } from "@std/assert";
import type { AgentApiResult } from "../_shared/agent/anthropic.ts";
import * as guiaEdge from "../_shared/guia-ayuda.ts";
import * as guiaFuente from "../../../../../packages/shared-schema/src/utils/guia-ayuda.ts";
import { buildSystem, formatGuia, runSupportAgent } from "./agent.ts";
import { humanReplyNotice, supportHoursStatus } from "./hours.ts";
import { historyToMessages, pickTicketToReuse } from "./store.ts";

Deno.test("la guía de la Edge Function es idéntica a la de @geemastudio/shared-schema", () => {
  // Si falla: cp packages/shared-schema/src/utils/guia-ayuda.ts \
  //   apps/geemastudio-server/supabase/functions/_shared/guia-ayuda.ts
  assertEquals(guiaEdge.GUIA_AYUDA, guiaFuente.GUIA_AYUDA);
  assertEquals(guiaEdge.GUIA_CATEGORIAS, guiaFuente.GUIA_CATEGORIAS);
});

Deno.test("horario 8:00–20:00 hora de Venezuela (UTC−4)", () => {
  assertEquals(
    supportHoursStatus(new Date("2026-10-16T11:59:00Z")).open,
    false,
  ); // 7:59
  assertEquals(supportHoursStatus(new Date("2026-10-16T12:00:00Z")).open, true); // 8:00
  assertEquals(supportHoursStatus(new Date("2026-10-16T23:59:00Z")).open, true); // 19:59
  const closed = supportHoursStatus(new Date("2026-10-17T00:00:00Z")); // 20:00
  assertEquals(closed.open, false);
  assertEquals(closed.localTime, "20:00");
  assertStringIncludes(humanReplyNotice(closed), "desde las 8:00");
});

Deno.test("historyToMessages agrupa turnos y arranca en el usuario", () => {
  const row = (id: number, direction: "in" | "out", body: string) => ({
    id,
    direction,
    body,
    created_at: "",
  });
  const msgs = historyToMessages([
    row(1, "out", "respuesta vieja sin pregunta"),
    row(2, "in", "hola"),
    row(3, "in", "no puedo agendar"),
    row(4, "out", "¿desde la web o la app?"),
    row(5, "in", " "),
    row(6, "in", "web"),
  ]);
  assertEquals(msgs, [
    { role: "user", content: "hola\nno puedo agendar" },
    { role: "assistant", content: "¿desde la web o la app?" },
    { role: "user", content: "web" },
  ]);
});

Deno.test("formatGuia filtra por categoría", () => {
  const agenda = formatGuia("agenda");
  assertStringIncludes(agenda, "¿Cómo creo o agendo una nueva cita?");
  assertEquals(agenda.includes("recargo"), false);
  assertStringIncludes(formatGuia("todas"), "recargo");
});

Deno.test("buildSystem pasa el horario calculado por código", () => {
  const sys = buildSystem({
    hours: { open: false, localTime: "21:10" },
    contactName: "Ana",
  });
  assertEquals(sys[0].cache_control?.type, "ephemeral");
  assertStringIncludes(sys[1].text, "fuera de horario");
  assertStringIncludes(sys[1].text, "21:10");
  assertEquals(sys[1].text.includes("Casos abiertos"), false);
});

Deno.test("buildSystem muestra los casos abiertos para no duplicarlos", () => {
  const sys = buildSystem({
    hours: { open: true, localTime: "10:00" },
    contactName: null,
    openTickets: [{ id: 1, categoria: "cobro", summary: "Cobro doble" }],
  });
  assertStringIncludes(sys[1].text, "#1 (cobro): Cobro doble");
  assertStringIncludes(sys[1].text, "No los vuelvas a registrar");
});

Deno.test("pickTicketToReuse: misma categoría o ráfaga de 30 minutos", () => {
  const now = Date.parse("2026-10-17T05:00:00Z");
  const cobro = {
    id: 1,
    categoria: "cobro",
    summary: "",
    created_at: "2026-10-16T03:00:00Z",
  };
  const reciente = {
    id: 2,
    categoria: "error",
    summary: "",
    created_at: "2026-10-17T04:45:00Z",
  };
  assertEquals(pickTicketToReuse([reciente, cobro], "cobro", now)?.id, 1);
  assertEquals(pickTicketToReuse([reciente, cobro], "cuenta", now)?.id, 2);
  assertEquals(pickTicketToReuse([reciente, cobro], null, now)?.id, 2);
  assertEquals(pickTicketToReuse([cobro], "cuenta", now), null);
});

function apiResult(
  content: AgentApiResult["content"],
  stopReason: string,
): AgentApiResult {
  return {
    content,
    stopReason,
    inputTokens: 10,
    outputTokens: 5,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 2,
  };
}

Deno.test("runSupportAgent ejecuta escalar_a_humano y devuelve el texto final", async () => {
  const escalated: unknown[] = [];
  let calls = 0;
  const res = await runSupportAgent({
    system: [],
    history: [{ role: "user", content: "me cobraron doble" }],
    handlers: {
      escalate: (input) => {
        escalated.push(input);
        return Promise.resolve("Caso #7 registrado.");
      },
    },
    call: (messages) => {
      calls++;
      if (calls === 1) {
        return Promise.resolve(apiResult([{
          type: "tool_use",
          id: "t1",
          name: "escalar_a_humano",
          input: { resumen: "Cobro doble", categoria: "cobro", urgente: false },
        }], "tool_use"));
      }
      const last = messages[messages.length - 1];
      const results = last.content as { content: string }[];
      assertEquals(results[0].content, "Caso #7 registrado.");
      return Promise.resolve(
        apiResult(
          [{ type: "text", text: "Listo, tu caso es el #7." }],
          "end_turn",
        ),
      );
    },
  });
  assertEquals(escalated, [{
    resumen: "Cobro doble",
    categoria: "cobro",
    urgente: false,
  }]);
  assertEquals(res?.text, "Listo, tu caso es el #7.");
  assertEquals(res?.inputTokens, 24);
  assertEquals(res?.outputTokens, 10);
});

Deno.test("runSupportAgent devuelve null si la API falla", async () => {
  const res = await runSupportAgent({
    system: [],
    history: [{ role: "user", content: "hola" }],
    handlers: { escalate: () => Promise.resolve("") },
    call: () => Promise.resolve(null),
  });
  assertEquals(res, null);
});
