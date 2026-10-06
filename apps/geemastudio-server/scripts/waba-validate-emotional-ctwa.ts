#!/usr/bin/env -S deno run --allow-read --config supabase/functions/deno.json
/**
 * Unit test — venta emocional CTWA v1 (sin webhook).
 */
import {
  applyEmotionalPlaceholders,
  buildAlmostCloseNudge1Text,
  buildEmotionalDeclineReply,
  cartServiceIdsAreExtOrLift,
  isCtwaEmotionalEligible,
  pickRotatingLine,
  primaryRubroFromServiceIds,
} from "../supabase/functions/whatsapp-webhook/lib/emotional-selling.ts";
import { isDeclineIntent } from "../supabase/functions/whatsapp-webhook/handlers/menu-remap.ts";
import type { ServiceCatalog } from "../supabase/functions/whatsapp-webhook/lib/services-catalog.ts";

type Case = { name: string; pass: boolean };
const cases: Case[] = [];

function check(name: string, pass: boolean) {
  cases.push({ name, pass });
}

const catalog = {
  servicesById: new Map([
    [
      "svc-anime",
      {
        id: "svc-anime",
        name: "Anime",
        price: "110",
        duration: 120,
        category_id: "cat-extensiones",
      },
    ],
    [
      "svc-lift",
      {
        id: "svc-lift",
        name: "Lifting de Pestañas",
        price: "60",
        duration: 60,
        category_id: "cat-lifting",
      },
    ],
    [
      "svc-gel",
      {
        id: "svc-gel",
        name: "Builder Gel",
        price: "60",
        duration: 90,
        category_id: "cat-unas",
      },
    ],
  ]),
} as unknown as ServiceCatalog;

check(
  "CTWA + solo extensiones → elegible",
  isCtwaEmotionalEligible("2026-08-28T12:00:00Z", ["svc-anime"], catalog),
);
check(
  "sin from_ad_at → no elegible",
  !isCtwaEmotionalEligible(null, ["svc-anime"], catalog),
);
check(
  "mix ext + uñas → no elegible",
  !cartServiceIdsAreExtOrLift(["svc-anime", "svc-gel"], catalog),
);
check(
  "rubro primario extensiones",
  primaryRubroFromServiceIds(["svc-anime"], catalog) === "extensiones",
);
check(
  "rotación estable por teléfono",
  pickRotatingLine("51966478474", ["a", "b", "c"]) ===
    pickRotatingLine("51966478474", ["a", "b", "c"]),
);
check(
  "placeholder {servicio}",
  applyEmotionalPlaceholders("Hola {servicio}", { servicio: "Anime" }).includes(
    "Anime",
  ),
);
check(
  "decline default no vacío",
  buildEmotionalDeclineReply(new Map()).length > 20,
);
check(
  "nudge1 incluye calendario",
  buildAlmostCloseNudge1Text(
    new Map(),
    "51999000997",
    "extensiones",
    "Anime",
  ).includes("calendario"),
);
check(
  '"voy a pensarlo" → decline',
  isDeclineIntent("voy a pensarlo todavía, gracias por la información"),
);
check(
  '"gracias por la info" → decline',
  isDeclineIntent("gracias por la info"),
);
check(
  '"agendar para más adelante, el jueves a las 3pm" → NO decline',
  isDeclineIntent("quiero agendar para más adelante, el jueves a las 3pm") ===
    false,
);
check(
  '"todavía no sé, pero anótame para el sábado 4pm" → NO decline',
  isDeclineIntent("todavía no sé, pero anótame para el sábado 4pm") === false,
);
check(
  '"por ahora no, gracias" (sin booking) → decline',
  isDeclineIntent("por ahora no, gracias") === true,
);
check(
  '"todavía no, tal vez otro día" (sin booking) → decline',
  isDeclineIntent("todavía no, tal vez otro día") === true,
);

const failed = cases.filter((c) => !c.pass);
for (const c of cases) {
  console.log(`  ${c.pass ? "✅" : "❌"} ${c.name}`);
}
console.log(
  `\n${failed.length === 0 ? "✅" : "❌"} ${cases.length - failed.length}/${cases.length} casos`,
);
if (failed.length > 0) Deno.exit(1);
