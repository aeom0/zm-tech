import { assertEquals } from "@std/assert";

import { inboundSilenceReason } from "./anti-spam.ts";

const noConfig = new Map();

Deno.test("anti-spam: pregunta de la clienta por el horario no es spam (caso Nisset)", () => {
  for (
    const text of [
      "Hasta que hora es su horario de atención ?",
      "¿Su horario de atención es hasta las 7?",
      "¿Cuál es su horario de atención los sábados por la tarde?",
    ]
  ) {
    assertEquals(
      inboundSilenceReason("51999000999", text, noConfig),
      null,
      text,
    );
  }
});

Deno.test("anti-spam: autorespuesta de horario de otro negocio sigue siendo spam", () => {
  for (
    const text of [
      "Nuestro horario de atención es de lunes a viernes de 9 a 6.",
      "Gracias por escribirnos. Nuestro horario de atencion es de 8am a 5pm, responderemos lo antes posible.",
    ]
  ) {
    assertEquals(
      inboundSilenceReason("51999000999", text, noConfig),
      "spam",
      text,
    );
  }
});
