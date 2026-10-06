#!/usr/bin/env -S deno run --allow-read --config supabase/functions/deno.json
/**
 * Unit test — bloque #25 `handlers/menu-remap.ts` (sin webhook).
 */
import { WA_IDS } from "../supabase/functions/whatsapp-webhook/lib/constants.ts";
import {
  isDeclineIntent,
  isShortAffirmativeText,
  remapMenuTextUserInput,
} from "../supabase/functions/whatsapp-webhook/handlers/menu-remap.ts";

type Case = { name: string; pass: boolean };
const cases: Case[] = [];

function check(name: string, pass: boolean) {
  cases.push({ name, pass });
}

function remap(
  messageText: string,
  session: { cartItems?: unknown[] } | null = null,
) {
  return remapMenuTextUserInput({
    messageText,
    lower: messageText.toLowerCase(),
    session,
  });
}

// ── Remapeos básicos ────────────────────────────────────────────────────────
{
  const r1 = remap("quiero agregar otro servicio");
  check(
    "agregar otro → AGREGAR_OTRO",
    r1.kind === "remapped" && r1.userInput === WA_IDS.AGREGAR_OTRO,
  );
  const r2 = remap("agendar ya");
  check(
    "agendar ya → AGENDAR_YA",
    r2.kind === "remapped" && r2.userInput === WA_IDS.AGENDAR_YA,
  );
  const rAgendar = remap("agendar");
  check(
    "B4 agendar puro → AGENDAR_YA",
    rAgendar.kind === "remapped" && rAgendar.userInput === WA_IDS.AGENDAR_YA,
  );
  check(
    "B4 voy agendar semana que viene → no_match (Haiku)",
    remap("Voy agendar para la semana que viene").kind === "no_match",
  );
  check(
    "B4 reserva para pestañas → no_match (Haiku)",
    remap("reserva para pestañas naturales?").kind === "no_match",
  );
  const r3 = remap("ver mi selección");
  check(
    "ver selección → VER_SELECCION",
    r3.kind === "remapped" && r3.userInput === WA_IDS.VER_SELECCION,
  );
  const r4 = remap("vaciar carrito");
  check(
    "vaciar carrito → VACIAR_CARRITO",
    r4.kind === "remapped" && r4.userInput === WA_IDS.VACIAR_CARRITO,
  );
  const r5 = remap("mi cita");
  check(
    "mi cita → mi_cita",
    r5.kind === "remapped" && r5.userInput === "mi_cita",
  );
  const rReserve = remap("Reserve mi cita por la mañana");
  check(
    "PR134 Reserve mi cita → agendar_cita",
    rReserve.kind === "remapped" && rReserve.userInput === "agendar_cita",
  );
  const rReservame = remap("resérvame mi cita");
  check(
    "PR134 resérvame mi cita → agendar_cita",
    rReservame.kind === "remapped" && rReservame.userInput === "agendar_cita",
  );
}

// ── Guards ──────────────────────────────────────────────────────────────────
check(
  "agregar los 3 → no_match (Haiku)",
  remap("agregar los 3 servicios").kind === "no_match",
);
check("no gracias → decline", isDeclineIntent("no gracias") === true);
check(
  "precio + no quiero gel → no decline (Stefy)",
  isDeclineIntent("cuanto cuesta, no quiero gel") === false,
);
check(
  "voy a pensarlo → decline",
  isDeclineIntent("voy a pensarlo todavía, gracias por la información") ===
    true,
);
check(
  "agendar + más adelante + fecha → no decline",
  isDeclineIntent("quiero agendar para más adelante, el jueves a las 3pm") ===
    false,
);
check(
  "por ahora no sin booking → decline",
  isDeclineIntent("por ahora no, gracias") === true,
);

// ── Afirmativas cortas ──────────────────────────────────────────────────────
check(
  "sí con carrito → short_affirmative_with_cart",
  (() => {
    const r = remap("sí", { cartItems: [{ item_type: "service" }] });
    return r.kind === "short_affirmative_with_cart";
  })(),
);
check(
  "ok sin carrito → short_affirmative_no_cart",
  (() => {
    const r = remap("ok", null);
    return r.kind === "short_affirmative_no_cart";
  })(),
);
check(
  "pack confirm: Si claro el pack es mejor → no_match (no ver_packs)",
  remap("Si claro el pack es mejor").kind === "no_match",
);
check(
  "Si confirmamos → no_match (no menú)",
  remap("Si confirmamos").kind === "no_match",
);
check(
  "packs browse sigue yendo a ver_packs",
  remap("ver packs").kind === "remapped" &&
    (remap("ver packs") as { userInput?: string }).userInput === "ver_packs",
);
check(
  "El pack tras cotizar → no_match (no ver_packs)",
  remap("El pack").kind === "no_match",
);
check(
  "ver promos → ver_promos",
  remap("ver promos").kind === "remapped" &&
    (remap("ver promos") as { userInput?: string }).userInput === "ver_promos",
);
check(
  "la promo → no_match (Haiku / CTA)",
  remap("la promo").kind === "no_match",
);
check(
  "ver promos de uñas → no_match (Haiku)",
  remap("ver promos de uñas").kind === "no_match",
);
check(
  "vi la promo de Mirada de Impacto → no_match",
  remap("vi la promo de Mirada de Impacto").kind === "no_match",
);

// ── Auditoría sombra 28-ago: no deben remapear ─────────────────────────────
const auditNoRemap = [
  "Buenas tardes tienes turno hoy a las 4pm",
  "Me confirmas xfavor gracias",
  "Hoy a las 4pm pestañas",
  "Podrá ser a las 5 pm",
  "Estoy a 2 minutos",
  "Ya llegie",
  "Todavía tengo problemas con mis uñas están quebradizas",
];
for (const msg of auditNoRemap) {
  check(
    `audit no remap: "${msg.slice(0, 32)}…"`,
    remap(msg).kind === "no_match",
  );
}

let fails = 0;
console.log("QA menu-remap — bloque #25\n");
for (const c of cases) {
  console.log(`${c.pass ? "✅" : "❌"} ${c.name}`);
  if (!c.pass) fails++;
}
console.log(
  fails === 0
    ? `\n✅ ${cases.length}/${cases.length} OK`
    : `\n❌ ${fails}/${cases.length} fallaron`,
);
Deno.exit(fails === 0 ? 0 : 1);
