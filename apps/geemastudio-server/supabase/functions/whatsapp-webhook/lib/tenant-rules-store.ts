// lib/tenant-rules-store.ts — Cache por tenant de tenant_settings.waba_rules (S5-2).
// Sin dependencias de constants.ts a propósito: constants.ts lo consulta desde
// getSalonTimeSlots() y un import circular rompería DEFAULT_ZM_WABA_RULES (TDZ).
// Los getters devuelven undefined si el tenant no fue hidratado → el caller cae
// a su valor hardcodeado de ZM (comportamiento previo a S5-2).

import { getRequestTenantId } from "./tenant.ts";
import type { TenantWabaRules } from "./tenant-rules.ts";

const rulesByTenant = new Map<string, { rules: TenantWabaRules; at: number }>();
export const TENANT_RULES_TTL_MS = 5 * 60 * 1000;

export function setLoadedWabaRules(
  tenantId: string,
  rules: TenantWabaRules,
): void {
  rulesByTenant.set(tenantId, { rules, at: Date.now() });
}

export function isWabaRulesFresh(tenantId: string): boolean {
  const c = rulesByTenant.get(tenantId);
  return !!c && Date.now() - c.at < TENANT_RULES_TTL_MS;
}

/** Reglas ya hidratadas del tenant del request actual, o undefined. */
export function getLoadedWabaRules(
  tenantId: string = getRequestTenantId(),
): TenantWabaRules | undefined {
  return rulesByTenant.get(tenantId)?.rules;
}

export function clearLoadedWabaRules(): void {
  rulesByTenant.clear();
}
