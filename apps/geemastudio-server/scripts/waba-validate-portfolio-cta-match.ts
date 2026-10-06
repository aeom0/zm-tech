#!/usr/bin/env -S deno run --allow-read --config supabase/functions/deno.json
/**
 * Unit: la foto/CTA de precio usa el servicio que Haiku acaba de cotizar,
 * no el pie de efecto compartido (ardilla / muñeca / ojo de gato) de otro host.
 * Ivonne …1911, Naila PE.…4104, K.made …6651 (27-sep-2026).
 */
import {
  findBestPortfolioMatchForText,
  type PortfolioIndexEntry,
} from "../supabase/functions/whatsapp-webhook/lib/portfolio.ts";

const CAT = "cat-extensiones";

function entry(
  serviceId: string,
  serviceName: string,
  caption: string,
  sortOrder: number,
): PortfolioIndexEntry {
  return {
    serviceId,
    serviceName,
    categoryId: CAT,
    url: `https://example.test/${serviceId}-${sortOrder}.jpg`,
    caption,
    sortOrder,
  };
}

/** Índice mínimo con los pies reales que cruzan efectos entre servicios. */
const INDEX: PortfolioIndexEntry[] = [
  entry("baby3", "Baby Vol. Tecnológica 3D", "Efecto: Ojo de gato 🪷", 0),
  entry("baby3", "Baby Vol. Tecnológica 3D", "Efecto: Ojo abierto 🌷", 1),
  entry("baby3", "Baby Vol. Tecnológica 3D", "Efecto: Muñeca 🌸", 2),
  entry("baby3", "Baby Vol. Tecnológica 3D", "Efecto: Ardilla 💜", 3),
  entry(
    "baby4",
    "Baby Vol. Tecnológica 4D",
    "🪻 Volumen Tecnológico 4D // Diseño Muñeca",
    0,
  ),
  entry("rimel", "Extensiones Rímel", "💜 Rímel // Diseño Ojo de gato", 0),
  entry("rimel", "Extensiones Rímel", "🌷 Rímel //  Diseño Ardilla", 1),
  entry("rimel", "Extensiones Rímel", "🪷 Rímel // Ojo abierto", 2),
  entry("fox", "Extensiones Fox", "✨ Fox // Ojo de gato", 0),
  entry(
    "retoque-baby",
    "Retoque Baby Vol. Tec 3D",
    "✨ Retoque Vol. Tec. 3D",
    0,
  ),
];

const cases: {
  name: string;
  text: string;
  expectServiceId: string | null;
  expectCaptionIncludes?: string;
}[] = [
  {
    name: "Ivonne …1911 — Rímel ardilla, no Baby Vol",
    text:
      "Rimel ardilla\nExtensiones Rímel con efecto ardilla — S/85 ¿Te agendo este look?",
    expectServiceId: "rimel",
    expectCaptionIncludes: "ardilla",
  },
  {
    name: "Naila PE.…4104 — retoque Rímel no hereda foto de Baby Vol",
    text: "las rimel\nRetoque Clásicas/Rímel — S/50 ¿Te agendo?",
    expectServiceId: null,
  },
  {
    name: "K.made …6651 — Rímel y 4D cotizados, no Baby Vol 3D",
    text:
      "Rímel ojo de gato y 4D muñeca\nRímel ojo de gato — S/85\n4D muñeca — S/110",
    expectServiceId: "rimel",
    expectCaptionIncludes: "ojo de gato",
  },
  {
    name: "efecto suelto ardilla + S/ sigue en Baby Vol",
    text: "quiero ardilla\nEse look ardilla está en S/100",
    expectServiceId: "baby3",
    expectCaptionIncludes: "ardilla",
  },
  {
    name: "cotización con nombre Baby Vol gana sobre el efecto",
    text:
      "ardilla\nBaby Vol. Tecnológica 3D con efecto ardilla — S/100 ¿Te agendo?",
    expectServiceId: "baby3",
    expectCaptionIncludes: "ardilla",
  },
  {
    name: "sin precio, ardilla sigue matcheando por caption",
    text: "muéstrame el efecto ardilla",
    expectServiceId: "baby3",
  },
  {
    name: "Fox cotizado no pierde contra ojo de gato de Baby Vol",
    text: "Extensiones Fox — S/90 ¿Te agendo?",
    expectServiceId: "fox",
  },
];

let fails = 0;
for (const c of cases) {
  const got = findBestPortfolioMatchForText(c.text, INDEX, CAT);
  const serviceOk = (got?.serviceId ?? null) === c.expectServiceId;
  const captionOk = !c.expectCaptionIncludes ||
    (got?.caption ?? "").toLowerCase().normalize("NFD").replace(
      /[\u0300-\u036f]/g,
      "",
    ).includes(c.expectCaptionIncludes);
  if (!serviceOk || !captionOk) {
    console.error(
      `❌ ${c.name}\n  expect ${c.expectServiceId} got ${
        got?.serviceId ?? null
      } caption=${got?.caption ?? ""}`,
    );
    fails++;
  } else {
    console.log(`✅ ${c.name}`);
  }
}
console.log(`\n${cases.length - fails}/${cases.length} OK`);
Deno.exit(fails > 0 ? 1 : 0);
