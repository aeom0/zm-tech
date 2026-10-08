import { templateLogToHistoryText } from "./template-history.ts";

function eq(actual: string, expected: string) {
  if (actual !== expected) {
    throw new Error(
      `esperado ${JSON.stringify(expected)}, obtuvo ${JSON.stringify(actual)}`,
    );
  }
}

Deno.test("plantilla promo: quita prefijo técnico y nombre de la clienta", () => {
  eq(
    templateLogToHistoryText(
      "[plantilla:promo_zm_v1] LILIAM · ¡PROMO Extensiones Clásicas S/50!",
    ),
    "[Plantilla enviada por el salón]: ¡PROMO Extensiones Clásicas S/50!",
  );
});

Deno.test("plantilla sin cuerpo no aporta historial", () => {
  eq(templateLogToHistoryText("[plantilla:promo_zm_v1]"), "");
});
