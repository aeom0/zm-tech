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

Deno.test("plantilla de ricino explica el cuidado, no solo la etiqueta", () => {
  eq(
    templateLogToHistoryText(
      "[plantilla:lifting_cuidados_ricino_zm] PATI · cuidados ricino",
    ),
    "[Plantilla enviada por el salón]: cuidados de lifting. Desde el día 10 aplica aceite de ricino en las pestañas (cuidado en casa, no es un servicio).",
  );
});
