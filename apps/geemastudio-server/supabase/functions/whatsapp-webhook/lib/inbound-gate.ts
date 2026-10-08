/**
 * inbound-gate.ts — Anti-race híbrido para webhooks WABA en ráfaga.
 * 1) wamid UNIQUE: ignora reintentos Meta y duplicados exactos.
 * 2) Claim atómico por teléfono (fila en wa_action_debounce) + ventana corta:
 *    agrupa texto en ráfaga antes de dispatch/Haiku.
 *
 * Antes (hasta 02-ago-2026) esto usaba pg_try_advisory_lock/pg_advisory_unlock
 * (lock de sesión). Acquire y release son llamadas RPC independientes que,
 * vía el pooler de Supabase, pueden caer en conexiones físicas distintas —
 * pg_advisory_unlock en otra conexión falla en silencio y el lock queda
 * huérfano, bloqueando toda ráfaga futura de ese teléfono (caso Eli
 * 51975781033). El claim por fila con TTL (wa_action_debounce) no depende
 * de qué conexión lo libera, y además se auto-cura si el release nunca llega.
 *
 * Trailing-edge (13-ago, Loren …4648): tras la ventana base, se extiende la
 * espera mientras sigan llegando inbounds (tope MAX), para que 3 msgs en ~6s
 * caigan en un solo coalesce/dispatch y no en 3 turnos independientes.
 */

import type { SupabaseClient } from "./supabase.ts";
import { getRequestTenantId } from "./tenant.ts";

/**
 * Espera base antes de leer mensajes agrupados (ms).
 * 4.5s cubre el patrón CTWA + precio ~5s después (Yesenia 2026-07-11)
 * sin alargar demasiado el 1.er turno.
 */
export const COALESCE_WINDOW_MS = 4500;

/**
 * Tope absoluto de espera con trailing-edge (ms).
 * Cubre ráfagas tipo Loren (msgs a 0/2/6s) sin bloquear >~9s el 1.er turno.
 */
export const COALESCE_MAX_MS = 9000;

/** Polling del trailing-edge: ¿llegó inbound nuevo? */
export const COALESCE_TRAIL_POLL_MS = 500;

/** Ventana de lectura hacia atrás al coalescer (ms). */
export const COALESCE_LOOKBACK_MS = 12000;

/** Reintentos si el lock del teléfono está ocupado (no dropear el mensaje).
 * Debe cubrir COALESCE_MAX_MS del líder (~9s) para no disparar soft-lock
 * mid-trailing (Loren QA). */
export const COALESCE_LOCK_RETRY_MAX = 7;
export const COALESCE_LOCK_RETRY_MS = 1500;

/** kind del claim en wa_action_debounce para el phone-lock de coalescing. */
const PHONE_LOCK_KIND = "inbound_coalesce";

/**
 * kind del claim "hay un dispatch (Haiku/menú) en vuelo para este teléfono".
 * Distinto de PHONE_LOCK_KIND: ese solo cubre la ventana de *lectura* del
 * texto en ráfaga (unos segundos); este cubre el round-trip completo de
 * Haiku + envío de la respuesta, que puede tardar bastante más.
 */
const DISPATCH_INFLIGHT_KIND = "dispatch_inflight";

/**
 * TTL del claim de dispatch en vuelo (segundos). Debe cubrir el peor caso
 * realista de un round-trip Haiku (timeout nominal 5s, pero con saludo +
 * pregunta calificadora encadenados se ha visto ~17-20s en producción —
 * caso Cami …6725, 19-sep-2026).
 */
const DISPATCH_INFLIGHT_TTL_SECONDS = 30;

/**
 * Lookback del re-chequeo POST-espera de turno (`shouldSkipDispatchPeerAlreadyHandled`).
 * Debe cubrir COALESCE_LOOKBACK_MS + lo máximo que se espera el turno (TTL del claim):
 * con 12s a secas, un follow-up que esperó >12s ya no ve su propio IN y re-despacha
 * Haiku (Shantal …5482, Rossy …4575, Lucy …8203; 23-sep-2026).
 */
export const POST_WAIT_SKIP_LOOKBACK_MS = COALESCE_LOOKBACK_MS +
  DISPATCH_INFLIGHT_TTL_SECONDS * 1000;

/** Reintentos al esperar que se libere el turno de otro leader del mismo teléfono. */
const DISPATCH_INFLIGHT_RETRY_MAX = 14;
const DISPATCH_INFLIGHT_RETRY_MS = 1500;

/**
 * Snapshot: hasta qué instante el líder leyó inbounds al soltar el coalesce.
 * `shouldSkipDispatchPeerAlreadyHandled` solo skipea si el último IN es
 * ≤ este claimed_at (Smil …9843: IN a +9.18s quedaba fuera del MAX y el
 * skip por lastOut>lastIn lo descartaba).
 */
const COALESCE_COVERED_KIND = "inbound_coalesce_covered";

/**
 * TTL del claim en segundos — red de seguridad si releasePhoneLock nunca
 * llega a ejecutarse (crash, timeout). Debe cubrir COALESCE_MAX_MS con
 * margen; no debe ser tan largo que un release perdido bloquee al teléfono
 * más de lo necesario.
 */
const PHONE_LOCK_TTL_SECONDS = 12;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Inserta fila inbound con wamid. Retorna false si ya existía (23505).
 */
export async function claimInboundMessage(
  supabase: SupabaseClient,
  opts: {
    phone: string;
    wamid: string;
    content: string;
    msg_type: string;
    /** Meta media id (image/audio/document/sticker/video) para re-descarga. */
    media_id?: string | null;
    /**
     * Step de `whatsapp_sessions` ANTES del dispatch (observabilidad).
     * Research 10-sep: venía siempre null → fricción por step era ciega.
     */
    step_before?: string | null;
  },
): Promise<boolean> {
  const { error } = await supabase.from("wa_messages").insert({
    phone: opts.phone,
    direction: "in",
    msg_type: opts.msg_type,
    content: opts.content.slice(0, 2000),
    wamid: opts.wamid,
    media_id: opts.media_id ?? null,
    step_before: opts.step_before ?? null,
  });

  if (!error) return true;
  if (error.code === "23505") return false;

  console.error("[WABA] claim inbound error:", error.message);
  const { error: logError } = await supabase.from("wa_error_log").insert({
    phone: opts.phone,
    step: "inbound_claim",
    msg_type: opts.msg_type,
    error_message: `wa_messages inbound insert: ${error.message}`.slice(
      0,
      2000,
    ),
    context: {
      operation: "claimInboundMessage",
      wamid: opts.wamid,
    },
    fallback_sent: false,
  });
  if (logError) {
    console.error("[WABA] inbound claim error log:", logError.message);
  }
  // Error transitorio de BD: preferir procesar a perder mensaje.
  return true;
}

export async function tryAcquirePhoneLock(
  supabase: SupabaseClient,
  phone: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("waba_claim_action_debounce", {
    p_phone: phone,
    p_kind: PHONE_LOCK_KIND,
    p_window_seconds: PHONE_LOCK_TTL_SECONDS,
    p_tenant_id: getRequestTenantId(),
  });
  if (error) {
    console.error("[WABA] try phone lock:", error.message);
    return true;
  }
  return data === true;
}

export async function releasePhoneLock(
  supabase: SupabaseClient,
  phone: string,
): Promise<void> {
  const { error } = await supabase.rpc("waba_release_action_debounce", {
    p_phone: phone,
    p_kind: PHONE_LOCK_KIND,
    p_tenant_id: getRequestTenantId(),
  });
  if (error) console.error("[WABA] release phone lock:", error.message);
}

/** Marca el instante en que el líder cerró la lectura coalesce (antes del release). */
export async function markCoalesceCoverage(
  supabase: SupabaseClient,
  phone: string,
): Promise<void> {
  const { error } = await supabase.from("wa_action_debounce").upsert(
    {
      phone,
      kind: COALESCE_COVERED_KIND,
      claimed_at: new Date().toISOString(),
      tenant_id: getRequestTenantId(),
    },
    { onConflict: "tenant_id,phone,kind" },
  );
  if (error) {
    console.error("[WABA] mark coalesce coverage:", error.message);
  }
}

export type CoalescedInbound = {
  text: string;
  /** created_at del último inbound incluido en esta lectura. */
  coveredThroughIso: string | null;
};

/** Une textos inbound recientes del mismo teléfono (orden cronológico). */
export async function coalesceRecentInboundText(
  supabase: SupabaseClient,
  phone: string,
  lookbackMs = COALESCE_LOOKBACK_MS,
): Promise<string | null> {
  const bundle = await coalesceRecentInboundBundle(supabase, phone, lookbackMs);
  if (!bundle) return null;
  return bundle.text;
}

export async function coalesceRecentInboundBundle(
  supabase: SupabaseClient,
  phone: string,
  lookbackMs = COALESCE_LOOKBACK_MS,
): Promise<CoalescedInbound | null> {
  const since = new Date(Date.now() - lookbackMs).toISOString();
  const { data, error } = await supabase
    .from("wa_messages")
    .select("content, created_at")
    .eq("phone", phone)
    .eq("direction", "in")
    .eq("msg_type", "text")
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[WABA] coalesce query:", error.message);
    return null;
  }

  const rows = (data ?? []).filter(
    (row) => (row.content ?? "").trim().length > 0,
  );
  // Resultado vacío: la fila aún no es visible (lag de replicación > lookbackMs).
  // Retornar string vacío para que el caller lo distinga del error (null) y no dropee.
  if (!rows.length) return { text: "", coveredThroughIso: null };
  const lastAt = rows[rows.length - 1]?.created_at;
  return {
    text: rows.map((row) => (row.content ?? "").trim()).join("\n"),
    coveredThroughIso: typeof lastAt === "string" ? lastAt : null,
  };
}

const DISPATCH_ANSWERED_KIND = "inbound_dispatch_answered";

/**
 * El dispatch que va a contestar marca hasta qué inbound incluye.
 * Un OUT posterior no "cubre" un mensaje llegado después de esta marca
 * (ubicación mientras Haiku aún arma la respuesta del pack).
 */
export async function markDispatchAnsweredThrough(
  supabase: SupabaseClient,
  phone: string,
  coveredThroughIso: string,
): Promise<void> {
  const { error } = await supabase.from("wa_action_debounce").upsert(
    {
      phone,
      kind: DISPATCH_ANSWERED_KIND,
      claimed_at: coveredThroughIso,
      tenant_id: getRequestTenantId(),
    },
    { onConflict: "tenant_id,phone,kind" },
  );
  if (error) {
    console.error("[WABA] mark dispatch answered:", error.message);
  }
}

export async function isInboundAfterDispatchAnswered(
  supabase: SupabaseClient,
  phone: string,
  lookbackMs = COALESCE_LOOKBACK_MS,
): Promise<boolean> {
  const since = new Date(Date.now() - lookbackMs).toISOString();
  const { data: inRows } = await supabase
    .from("wa_messages")
    .select("created_at")
    .eq("phone", phone)
    .eq("direction", "in")
    .eq("msg_type", "text")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1);
  if (!inRows?.length) return false;
  const lastInMs = new Date(inRows[0].created_at as string).getTime();
  const { data: answered } = await supabase
    .from("wa_action_debounce")
    .select("claimed_at")
    .eq("phone", phone)
    .eq("kind", DISPATCH_ANSWERED_KIND)
    .eq("tenant_id", getRequestTenantId())
    .maybeSingle();
  const answeredMs = answered?.claimed_at
    ? new Date(answered.claimed_at as string).getTime()
    : 0;
  if (!(answeredMs > 0)) return false;
  return lastInMs > answeredMs;
}

/**
 * ¿Ya se envió el texto de ubicación a este teléfono en los últimos `windowMs`?
 * Caso Star …6469 (29-ago): 2 inbound coalescidos con el mismo timestamp —
 * uno disparaba el branch determinístico de ubicación (DEFAULT_UBICACION_TEXT,
 * bold) y el otro, al releer texto combinado, volvía a disparar el CASO —
 * ubicación de Haiku (plano) para el mismo turno. Guard reutilizable para no
 * volver a mandar el bloque de dirección si ya salió hace poco.
 */
export async function wasLocationRecentlySent(
  supabase: SupabaseClient,
  phone: string,
  windowMs = 60_000,
): Promise<boolean> {
  const since = new Date(Date.now() - windowMs).toISOString();
  const { data, error } = await supabase
    .from("wa_messages")
    .select("id")
    .eq("phone", phone)
    .eq("direction", "out")
    .gte("created_at", since)
    .ilike("content", "%Calle Artesanos 150%")
    .limit(1);
  if (error) {
    console.error("[WABA] wasLocationRecentlySent query:", error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

/** kind del claim en wa_action_debounce para el envío de ubicación. */
const LOCATION_SEND_KIND = "location_reply";

/** Ventana del claim de ubicación (debe igualar el `windowMs` histórico de wasLocationRecentlySent). */
const LOCATION_SEND_WINDOW_SECONDS = 60;

/**
 * Claim atómico "voy a mandar la ubicación ahora" (RPC waba_claim_action_debounce).
 * Reemplaza `wasLocationRecentlySent` como guard principal: ese check era una
 * lectura contra `wa_messages` DESPUÉS del hecho, y dejaba una ventana de carrera
 * real — confirmado con QA tras el fix de 29-ago (Star …6469) seguía duplicando.
 * El flujo vía Haiku tarda ~5-9s en escribir su respuesta; un segundo dispatch
 * (determinístico, casi instantáneo) leía "todavía no se envió" antes de que el
 * primero terminara de escribir, y ambos mandaban la dirección. El claim reserva
 * el turno ANTES de enviar/invocar Haiku — solo el primero en llamar gana, sin
 * depender de que el otro ya haya terminado de escribir.
 */
export async function tryClaimLocationSend(
  supabase: SupabaseClient,
  phone: string,
  windowSeconds = LOCATION_SEND_WINDOW_SECONDS,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("waba_claim_action_debounce", {
    p_phone: phone,
    p_kind: LOCATION_SEND_KIND,
    p_window_seconds: windowSeconds,
    p_tenant_id: getRequestTenantId(),
  });
  if (error) {
    console.error("[WABA] tryClaimLocationSend RPC:", error.message);
    // Fail-open controlado: si el RPC falla, no bloquear la respuesta —
    // cae al check legacy de solo-lectura (mejor que nada).
    return !(await wasLocationRecentlySent(
      supabase,
      phone,
      windowSeconds * 1000,
    ));
  }
  return data === true;
}

/** Último created_at de inbound texto en la ventana de lookback (ms epoch), o 0. */
async function latestInboundTextCreatedAtMs(
  supabase: SupabaseClient,
  phone: string,
  lookbackMs = COALESCE_LOOKBACK_MS,
): Promise<number> {
  const since = new Date(Date.now() - lookbackMs).toISOString();
  const { data, error } = await supabase
    .from("wa_messages")
    .select("created_at")
    .eq("phone", phone)
    .eq("direction", "in")
    .eq("msg_type", "text")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) {
    console.error("[WABA] latest inbound ts:", error.message);
    return 0;
  }
  const raw = data?.[0]?.created_at;
  if (!raw) return 0;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

/** Tras la ventana base: exigir esta quietud sin inbound nuevo antes de soltar. */
export const COALESCE_TRAIL_QUIET_MS = 1500;

/**
 * Tras la ventana base: si sigue llegando texto, extender hasta quietud o tope.
 * Evita que msg3 a los ~6s quede fuera del coalesce del líder (Loren …4648).
 * Quietud mínima COALESCE_TRAIL_QUIET_MS — no salir en el 1.er poll vacío
 * (race CTWA+precio Yesenia a los ~5s).
 */
async function waitTrailingEdgeForNewInbound(
  supabase: SupabaseClient,
  phone: string,
  startedAtMs: number,
): Promise<void> {
  const hardDeadline = startedAtMs + COALESCE_MAX_MS;
  let lastSeenMs = await latestInboundTextCreatedAtMs(supabase, phone);
  let quietSince = Date.now();
  while (Date.now() < hardDeadline) {
    await sleep(COALESCE_TRAIL_POLL_MS);
    const nextMs = await latestInboundTextCreatedAtMs(supabase, phone);
    if (nextMs > lastSeenMs) {
      lastSeenMs = nextMs;
      quietSince = Date.now();
      console.log(
        "[WABA] coalesce trailing-edge: inbound nuevo, extiende:",
        phone.slice(-4),
      );
    } else if (Date.now() - quietSince >= COALESCE_TRAIL_QUIET_MS) {
      break;
    }
  }
}

/**
 * True si el último inbound texto llegó *después* del snapshot
 * `inbound_coalesce_covered` del líder (Smil …9843). En ese caso el 2.º
 * mensaje no estaba en la lectura del líder y no debe dropearse aunque
 * el phone-lock haya estado ocupado / exhausted.
 */
export async function isInboundAfterLeaderCoalesceCoverage(
  supabase: SupabaseClient,
  phone: string,
  lookbackMs = COALESCE_LOOKBACK_MS,
): Promise<boolean> {
  const since = new Date(Date.now() - lookbackMs).toISOString();
  const { data: inRows } = await supabase
    .from("wa_messages")
    .select("created_at")
    .eq("phone", phone)
    .eq("direction", "in")
    .eq("msg_type", "text")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1);
  if (!inRows?.length) return false;
  const lastInMs = new Date(inRows[0].created_at as string).getTime();

  const { data: covered } = await supabase
    .from("wa_action_debounce")
    .select("claimed_at")
    .eq("phone", phone)
    .eq("kind", COALESCE_COVERED_KIND)
    .eq("tenant_id", getRequestTenantId())
    .maybeSingle();
  const coveredAt = covered?.claimed_at
    ? new Date(covered.claimed_at as string).getTime()
    : 0;
  if (!(coveredAt > 0)) return false;
  const coveredFresh = Date.now() - coveredAt <= lookbackMs + COALESCE_MAX_MS;
  return coveredFresh && lastInMs > coveredAt;
}

/**
 * True si el bot ya respondió este burst (último OUT después del último inbound)
 * y ese inbound ya estaba en la lectura del líder (`inbound_coalesce_covered`).
 *
 * Con trailing-edge + quietud, el líder incluye follow-ups ~5s; el retry-winner
 * no debe re-despachar (Loren). Si el último IN llegó *después* del snapshot
 * de cobertura (Smil …9843, gap ~9.18s > COALESCE_MAX), no skip — hay que
 * despachar la pregunta suelta (p. ej. ubicación).
 */
export async function shouldSkipDispatchPeerAlreadyHandled(
  supabase: SupabaseClient,
  phone: string,
  lookbackMs = COALESCE_LOOKBACK_MS,
): Promise<boolean> {
  const since = new Date(Date.now() - lookbackMs).toISOString();
  const { data: inRows, error: inErr } = await supabase
    .from("wa_messages")
    .select("created_at")
    .eq("phone", phone)
    .eq("direction", "in")
    .eq("msg_type", "text")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1);
  if (inErr || !inRows?.length) return false;

  const lastInAt = inRows[0].created_at as string;
  const lastInMs = new Date(lastInAt).getTime();
  const { data: outRows, error: outErr } = await supabase
    .from("wa_messages")
    .select("created_at")
    .eq("phone", phone)
    .eq("direction", "out")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1);
  if (outErr || !outRows?.length) return false;

  const lastOutAt = outRows[0].created_at as string;
  if (new Date(lastOutAt).getTime() <= lastInMs) {
    return false;
  }

  // El OUT es de un turno anterior si este inbound llegó después de lo que
  // ese turno alcanzó a leer (Alberto VE …0417, 4-oct: "dónde están" a los
  // 13s, mientras Haiku aún contestaba el pack).
  if (await isInboundAfterDispatchAnswered(supabase, phone, lookbackMs)) {
    console.log(
      "[WABA] no skip — inbound posterior al turno que ya contestó:",
      phone.slice(-4),
    );
    return false;
  }

  if (await isInboundAfterLeaderCoalesceCoverage(supabase, phone, lookbackMs)) {
    console.log(
      "[WABA] no skip — inbound posterior al coalesce del líder:",
      phone.slice(-4),
    );
    return false;
  }

  console.log(
    "[WABA] skip dispatch — peer ya respondió el burst:",
    phone.slice(-4),
  );
  return true;
}

/**
 * Para mensajes de texto libre: espera ventana (+ trailing) y agrupa texto.
 * Si no obtiene lock, retorna null (otra instancia puede estar coalesciendo).
 */
export async function coalesceTextBurstIfNeeded(
  supabase: SupabaseClient,
  phone: string,
  windowMs = COALESCE_WINDOW_MS,
): Promise<CoalescedInbound | null> {
  const acquired = await tryAcquirePhoneLock(supabase, phone);
  if (!acquired) {
    console.log(
      "[WABA] phone lock ocupado — mensaje coalescido por peer:",
      phone.slice(-4),
    );
    return null;
  }

  const startedAtMs = Date.now();
  const waitMs = Math.max(0, windowMs ?? COALESCE_WINDOW_MS);
  try {
    await sleep(waitMs);
    await waitTrailingEdgeForNewInbound(supabase, phone, startedAtMs);
    const bundle = await coalesceRecentInboundBundle(supabase, phone);
    // Antes del release: peers que vean OUT del líder no deben dropear INs
    // llegados *después* de esta lectura (Smil …9843).
    // inbound_dispatch_answered lo marca el caller solo si este turno despacha.
    await markCoalesceCoverage(supabase, phone);
    if (!bundle) return { text: "", coveredThroughIso: null };
    return bundle;
  } finally {
    await releasePhoneLock(supabase, phone);
  }
}

/**
 * Igual que coalesceTextBurstIfNeeded, pero reintenta el lock en vez de
 * dropear el mensaje (caso CTWA + follow-up ~5s cuando el peer ya cerró
 * la ventana sin incluir el 2.º texto).
 *
 * - bundle: obtuvimos el lock y coalescimos (text puede ser "").
 * - `null`: lock agotado tras reintentos — el peer está/estuvo coalesciendo la
 *   ráfaga; el caller debe **no** despachar Haiku otra vez (anti-dup mid-chat).
 */
export async function coalesceTextBurstWithRetry(
  supabase: SupabaseClient,
  phone: string,
  windowMs = COALESCE_WINDOW_MS,
): Promise<CoalescedInbound | null> {
  for (let attempt = 0; attempt < COALESCE_LOCK_RETRY_MAX; attempt++) {
    const bundle = await coalesceTextBurstIfNeeded(
      supabase,
      phone,
      windowMs ?? COALESCE_WINDOW_MS,
    );
    if (bundle !== null) return bundle;
    if (attempt < COALESCE_LOCK_RETRY_MAX - 1) {
      await sleep(COALESCE_LOCK_RETRY_MS);
    }
  }
  console.log(
    "[WABA] phone lock agotado — skip (peer coalesció ráfaga):",
    phone.slice(-4),
  );
  return null;
}

/**
 * Reclama el turno de dispatch (Haiku/menú) para este teléfono, sin esperar.
 * `true` = nadie más en vuelo, el caller puede despachar (y debe liberar con
 * `releaseDispatchTurn` al terminar). `false` = ya hay un dispatch en curso.
 */
async function tryClaimDispatchTurn(
  supabase: SupabaseClient,
  phone: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("waba_claim_action_debounce", {
    p_phone: phone,
    p_kind: DISPATCH_INFLIGHT_KIND,
    p_window_seconds: DISPATCH_INFLIGHT_TTL_SECONDS,
    p_tenant_id: getRequestTenantId(),
  });
  if (error) {
    console.error("[WABA] try dispatch turn:", error.message);
    return true; // fail-open: no bloquear el flujo por un error transitorio de BD.
  }
  return data === true;
}

export async function releaseDispatchTurn(
  supabase: SupabaseClient,
  phone: string,
): Promise<void> {
  const { error } = await supabase.rpc("waba_release_action_debounce", {
    p_phone: phone,
    p_kind: DISPATCH_INFLIGHT_KIND,
    p_tenant_id: getRequestTenantId(),
  });
  if (error) console.error("[WABA] release dispatch turn:", error.message);
}

/**
 * Espera (con reintentos) a que termine un dispatch en vuelo del mismo
 * teléfono antes de reclamar el turno — evita que dos ráfagas separadas por
 * más de COALESCE_MAX_MS abran dos round-trips de Haiku en paralelo para la
 * misma clienta (caso Cami …6725, 19-sep-2026: "Hola" a los 11s de un primer
 * saludo con intención abrió un 2.º leader de coalescing independiente; su
 * Haiku corrió en paralelo al primero y remató en un menú genérico —el
 * cliente vio *primero* la pregunta calificadora y *después*, sin haberla
 * respondido, el menú completo, matando la venta emocional). El único guard
 * previo (`hadRecentBotOutbound`) es retrospectivo: no ve una respuesta que
 * todavía está en vuelo en otra invocación del webhook.
 *
 * `true` = turno reclamado (el caller DEBE llamar `releaseDispatchTurn` al
 * terminar, incluso en error). `false` = se agotaron los reintentos con el
 * turno aún ocupado; fail-open — el caller despacha igual, sin lock, para no
 * dejar a la clienta sin respuesta si el otro leader murió sin liberar.
 */
export async function waitAndClaimDispatchTurn(
  supabase: SupabaseClient,
  phone: string,
): Promise<boolean> {
  for (let attempt = 0; attempt < DISPATCH_INFLIGHT_RETRY_MAX; attempt++) {
    if (await tryClaimDispatchTurn(supabase, phone)) return true;
    if (attempt < DISPATCH_INFLIGHT_RETRY_MAX - 1) {
      await sleep(DISPATCH_INFLIGHT_RETRY_MS);
    }
  }
  console.log(
    "[WABA] dispatch turn agotado — despacha sin lock (fail-open):",
    phone.slice(-4),
  );
  return false;
}
