// haiku-handoff.ts — Haiku primero; boilerplate de respaldo (Plan Haiku-primero + 08)

import { sendMessage } from "../../wa-api.ts";
import { resolveUbicacionReply } from "../../lib/salon-location.ts";
import { tryClaimLocationSend } from "../../lib/inbound-gate.ts";
import {
  detectAITrigger,
  handleAIMessage,
  isAIRateLimited,
} from "../ai-assistant.ts";
import { sessionHasCart, isMostlyLocationQuestion } from "../booking-flow.ts";
import {
  upsertSession,
  type SupabaseClient,
  type CartItem,
} from "../../lib/supabase.ts";
import type { ServiceCatalog } from "../../lib/services-catalog.ts";
import {
  getHaikuTriggerKeywordsFromWaba,
  getHaikuRuntimeSettings,
  type WabaConfigMap,
} from "../../lib/waba-config.ts";

export type HaikuHandOffOpts = {
  phoneNumber: string;
  contactName?: string | null;
  catalog: ServiceCatalog;
  supabase: SupabaseClient;
  phoneCountry?: string | null;
  wabaConfig: WabaConfigMap;
  haikuRuntime: ReturnType<typeof getHaikuRuntimeSettings>;
  session: { cartItems?: CartItem[] } | null;
  prompt: string;
};

/**
 * Opción interactiva no reconocida / catálogo vacío → Haiku en vez de
 * "No pude procesar… escribe menu" (Alberto VE …0417, 13-sep).
 */
export async function tryHandOffUnrecognizedToHaiku(
  opts: HaikuHandOffOpts,
): Promise<boolean> {
  const text = opts.prompt.trim();
  if (!text) return false;
  const haikuKeywords = getHaikuTriggerKeywordsFromWaba(opts.wabaConfig);
  const trigger =
    detectAITrigger(
      text,
      haikuKeywords,
      sessionHasCart(opts.session ?? null),
    ) ?? ({ type: "fallback", originalMessage: text } as const);
  if (
    await isAIRateLimited(
      opts.supabase,
      opts.phoneNumber,
      opts.haikuRuntime.rate_limit_per_hour,
    )
  ) {
    return false;
  }
  return await handleAIMessage(
    {
      phoneNumber: opts.phoneNumber,
      contactName: opts.contactName ?? "",
      catalog: opts.catalog,
      supabase: opts.supabase,
      phoneCountry: opts.phoneCountry,
    },
    trigger,
    opts.wabaConfig,
  );
}

/**
 * Plan Haiku-primero Batches 2–3: taps y preguntas "casi solo X" siguen
 * el texto estático; si queda contenido real, Haiku primero.
 */
export async function tryHaikuFirstUnlessMostly(
  skip: boolean,
  opts: HaikuHandOffOpts,
): Promise<boolean> {
  if (skip) return false;
  return await tryHandOffUnrecognizedToHaiku(opts);
}

export type LocationQuestionResult = "haiku" | "maps" | "silent";

/** Batch 3: 4 copias de ubicación → un helper (Sonnet B1–3). */
export async function handleLocationQuestion(
  opts: HaikuHandOffOpts & {
    locLower: string;
    ubicacionText: string;
    skipHaiku: boolean;
    browseIfMixed?: boolean;
    requireClaim: boolean;
  },
): Promise<LocationQuestionResult> {
  if (opts.browseIfMixed && !isMostlyLocationQuestion(opts.locLower)) {
    await upsertSession(opts.supabase, opts.phoneNumber, { step: "browsing" });
  }
  if (await tryHaikuFirstUnlessMostly(opts.skipHaiku, opts)) {
    return "haiku";
  }
  if (
    opts.requireClaim &&
    !(await tryClaimLocationSend(opts.supabase, opts.phoneNumber))
  ) {
    return "silent";
  }
  await sendMessage(
    opts.phoneNumber,
    resolveUbicacionReply(opts.locLower, opts.ubicacionText),
  );
  return "maps";
}
