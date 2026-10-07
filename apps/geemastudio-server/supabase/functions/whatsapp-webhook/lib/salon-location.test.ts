function assertEquals(actual: boolean, expected: boolean): void {
  if (actual !== expected) {
    throw new Error(`esperado ${expected}, fue ${actual}`);
  }
}

import { matchesParkingOrMovilidadQuestion } from "./salon-location.ts";
import { matchesLocationQuestion } from "../handlers/booking-flow.ts";

Deno.test("parking: ignora palabras del mensaje citado (SAM, 7-oct)", () => {
  assertEquals(
    matchesParkingOrMovilidadQuestion(
      "confirmo ↳ el estacionamiento del centro comercial es gratis 💜 ¿confirmas tu cita a las 5:00 pm hoy?",
    ),
    false,
  );
});

Deno.test("parking: sigue detectando la pregunta tipeada", () => {
  assertEquals(
    matchesParkingOrMovilidadQuestion("hay estacionamiento? ↳ hola"),
    true,
  );
  assertEquals(
    matchesParkingOrMovilidadQuestion("hay movilidad gratis?"),
    true,
  );
});

Deno.test("ubicación: ignora la cita, conserva lo tipeado", () => {
  assertEquals(
    matchesLocationQuestion("confirmo ↳ 📍 nuestra ubicación y dirección"),
    false,
  );
  assertEquals(
    matchesLocationQuestion("me brindan la dirección exacta ↳ ✅ listo"),
    true,
  );
});
