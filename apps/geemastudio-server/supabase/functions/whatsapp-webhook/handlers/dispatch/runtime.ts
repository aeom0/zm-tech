// runtime.ts — Contexto compartido del waterfall WABA (Plan 08)

import type { ServiceCatalog } from "../../lib/services-catalog.ts";
import type { SupabaseClient } from "../../lib/supabase.ts";
import { getSession } from "../../lib/supabase.ts";
import type {
  getHaikuRuntimeSettings,
  WabaConfigMap,
} from "../../lib/waba-config.ts";
import type { CampaignPromoImage } from "./campaign-images.ts";

export interface DispatchContext {
  body: Record<string, unknown>;
  message: Record<string, unknown>;
  phoneNumber: string;
  contactName: string;
  messageText: string;
  isNew: boolean;
  supabase: SupabaseClient;
  /** Catálogo pre-cargado (una sola carga por request); evita múltiples selects. */
  catalog: ServiceCatalog;
  /** Config editable WABA (una sola carga por request). */
  wabaConfig: WabaConfigMap;
  /** Tenant resuelto (phone_number_id + flag routing). */
  tenantId: string;
  /** true si el mensaje viene de un anuncio Meta Ads (Click-to-WhatsApp). */
  fromAd: boolean;
  /** Título/headline del anuncio Meta Ads (si vino por referral). */
  referralHeadline?: string | null;
  /** Código de país del número entrante (`clients.phone_country`, ej. "PE", "58", "33"). */
  phoneCountry?: string | null;
  /** Preview legible del mensaje entrante (para push a admins). */
  messagePreview?: string;
  /** Epoch ms cuando el inbound fue aceptado (antes del coalesce). Para filtro de ecos Meta. */
  inboundReceivedAt?: number;
}

export type DispatchSession = Awaited<ReturnType<typeof getSession>>;

export type DispatchSenders = {
  sendMessage: (to: string, body: string) => Promise<unknown>;
  sendImage: (to: string, url: string, caption?: string) => Promise<unknown>;
  sendInteractiveList: (
    to: string,
    header: string,
    body: string,
    btn: string,
    // deno-lint-ignore no-explicit-any
    sections: any,
  ) => Promise<unknown>;
};

export type DispatchCms = {
  ubicacionText: string;
  horariosText: string;
  tardanzaText: string;
  tardanzaImageUrl: string;
  clasesText: string;
  cursosExtensionesText: string;
  retiroOtroSalonText: string;
  metaAdsServicesText: string;
  campaignPromoImages: CampaignPromoImage[];
  extensionesPromoImages: CampaignPromoImage[];
  liftingPromoImages: CampaignPromoImage[];
  unasPromoImages: CampaignPromoImage[];
};

/** Sesión y senders mutables: los handlers actualizan `session` tras getSession. */
export type DispatchRuntime = {
  ctx: DispatchContext;
  session: DispatchSession;
  senders: DispatchSenders;
  cms: DispatchCms;
  haikuRuntime: ReturnType<typeof getHaikuRuntimeSettings>;
  msgType: string | undefined;
  hasInteractive: boolean;
  messagePreview: string;
  userInput: string;
  lower: string;
  interactiveId: string | null;
  isInteractive: boolean;
};
