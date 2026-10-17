// anthropic-credit.ts — Estado de crédito de Anthropic por cuenta.
//
// Cada agente usa su propia cuenta: ZM Lash (`ANTHROPIC_API_KEY`) y ZM Tech
// (`ZMTECH_ANTHROPIC_API_KEY`, agente de soporte). Las claves de `app_config`
// van separadas para que el aviso de crédito agotado diga de qué cuenta es.
// ZM Lash conserva las claves sin prefijo que ya leen la app y el panel.

import type { SupabaseClient } from "@supabase/supabase-js";

export type AnthropicAccount = "zmlash" | "zmtech";

export function anthropicCreditKeys(account: AnthropicAccount): {
  walletUsd: string;
  apiStatus: string;
} {
  const prefix = account === "zmtech" ? "zmtech_" : "";
  return {
    walletUsd: `${prefix}anthropic_wallet_usd`,
    apiStatus: `${prefix}anthropic_api_status`,
  };
}

/** True si el body/status de Anthropic indica prepaid sin fondos. */
export function isAnthropicCreditExhausted(
  status: number,
  bodyText: string,
): boolean {
  if (status === 402) return true;
  const lower = (bodyText || "").toLowerCase();
  return (
    lower.includes("credit balance is too low") ||
    lower.includes("purchase credits") ||
    lower.includes("plans & billing") ||
    (lower.includes("credit") && lower.includes("too low"))
  );
}

async function upsertAppConfig(
  supabase: SupabaseClient,
  key: string,
  value: string,
): Promise<void> {
  const { error } = await supabase.from("app_config").upsert(
    {
      key,
      value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  if (error) {
    console.warn(
      "[AI Credit] app_config upsert falló:",
      key,
      error.message?.slice(0, 120),
    );
  }
}

/** True si la cuenta ya figura con `credit_exhausted` (para avisar una sola vez). */
export async function isAnthropicCreditMarkedExhausted(
  supabase: SupabaseClient,
  account: AnthropicAccount,
): Promise<boolean> {
  const { data } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", anthropicCreditKeys(account).apiStatus)
    .maybeSingle();
  return data?.value === "credit_exhausted";
}

/** Crédito agotado: saldo 0 y estado `credit_exhausted` para esa cuenta. */
export async function markAnthropicCreditExhausted(
  supabase: SupabaseClient,
  account: AnthropicAccount,
): Promise<void> {
  const keys = anthropicCreditKeys(account);
  await upsertAppConfig(supabase, keys.walletUsd, "0");
  await upsertAppConfig(supabase, keys.apiStatus, "credit_exhausted");
}

/** Tras una llamada exitosa, limpia el estado `credit_exhausted` de esa cuenta. */
export async function clearAnthropicCreditExhausted(
  supabase: SupabaseClient,
  account: AnthropicAccount,
): Promise<void> {
  if (!(await isAnthropicCreditMarkedExhausted(supabase, account))) return;
  await upsertAppConfig(supabase, anthropicCreditKeys(account).apiStatus, "ok");
}
