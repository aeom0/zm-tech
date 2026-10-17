import { assertEquals, assertStringIncludes } from "@std/assert";
import { formatEscalationAlert, sendTelegramAlert } from "./telegram.ts";

function withEnv(
  vars: Record<string, string | undefined>,
  fn: () => Promise<void>,
) {
  return async () => {
    const prev: Record<string, string | undefined> = {};
    for (const [k, v] of Object.entries(vars)) {
      prev[k] = Deno.env.get(k);
      if (v === undefined) Deno.env.delete(k);
      else Deno.env.set(k, v);
    }
    try {
      await fn();
    } finally {
      for (const [k, v] of Object.entries(prev)) {
        if (v === undefined) Deno.env.delete(k);
        else Deno.env.set(k, v);
      }
    }
  };
}

Deno.test("formatEscalationAlert arma el aviso en texto plano", () => {
  const text = formatEscalationAlert({
    id: 12,
    reused: true,
    urgente: true,
    categoria: "cobro",
    resumen: "Cobro doble en octubre",
    phone: "51999000978",
    contactName: "Ana",
    enHorario: false,
  });
  assertEquals(text.split("\n")[0], "URGENTE · Caso #12 (actualizado) · cobro");
  assertStringIncludes(text, "Contacto: Ana +51999000978");
  assertStringIncludes(text, "fuera de horario");
  assertStringIncludes(text, "Cobro doble en octubre");
});

Deno.test(
  "sendTelegramAlert sin secrets no llama a la API",
  withEnv({
    SUPPORT_TELEGRAM_BOT_TOKEN: undefined,
    SUPPORT_TELEGRAM_CHAT_ID: undefined,
  }, async () => {
    let called = false;
    const ok = await sendTelegramAlert("hola", () => {
      called = true;
      return Promise.resolve(new Response("{}"));
    });
    assertEquals(ok, false);
    assertEquals(called, false);
  }),
);

Deno.test(
  "sendTelegramAlert envía chat_id y texto a sendMessage",
  withEnv({
    SUPPORT_TELEGRAM_BOT_TOKEN: "123:abc",
    SUPPORT_TELEGRAM_CHAT_ID: "-100",
  }, async () => {
    let url = "";
    let payload: Record<string, unknown> = {};
    const ok = await sendTelegramAlert("Caso #1", (input, init) => {
      url = String(input);
      payload = JSON.parse(String(init?.body));
      return Promise.resolve(new Response('{"ok":true}'));
    });
    assertEquals(ok, true);
    assertEquals(url, "https://api.telegram.org/bot123:abc/sendMessage");
    assertEquals(payload.chat_id, "-100");
    assertEquals(payload.text, "Caso #1");
    assertEquals("parse_mode" in payload, false);
  }),
);

Deno.test(
  "sendTelegramAlert no lanza si Telegram falla",
  withEnv({
    SUPPORT_TELEGRAM_BOT_TOKEN: "123:abc",
    SUPPORT_TELEGRAM_CHAT_ID: "-100",
  }, async () => {
    assertEquals(
      await sendTelegramAlert(
        "x",
        () => Promise.resolve(new Response("bad", { status: 400 })),
      ),
      false,
    );
    assertEquals(
      await sendTelegramAlert("x", () => Promise.reject(new Error("red"))),
      false,
    );
  }),
);
