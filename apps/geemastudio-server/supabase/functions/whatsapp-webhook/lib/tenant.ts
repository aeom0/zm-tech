import { AsyncLocalStorage } from "node:async_hooks";

/** Tenant ZM en prod (único hasta routing S3 vía tenant_waba_numbers). */
export const DEFAULT_TENANT_ID = "zm-lash-nails";

/**
 * Contexto de tenant por invocación de `processMessage()`. Reemplaza un
 * `let` a nivel de módulo (bug de aislamiento bajo requests concurrentes en
 * el mismo isolate — ver docs/plans/geema-migration/04-ROADMAP-SPRINTS.md § S3).
 */
const tenantContext = new AsyncLocalStorage<string>();

/**
 * Ejecuta `fn` con `tenantId` como contexto de request. Debe envolver TODO
 * el trabajo de un `processMessage()` individual — cualquier código que
 * llame `getRequestTenantId()` fuera de este wrapper recibe DEFAULT_TENANT_ID.
 */
export function runWithRequestTenantId<T>(
  tenantId: string,
  fn: () => T | Promise<T>,
): T | Promise<T> {
  const id =
    typeof tenantId === "string" && tenantId.trim()
      ? tenantId.trim()
      : DEFAULT_TENANT_ID;
  return tenantContext.run(id, fn);
}

/**
 * Lee el tenant del contexto de request actual. Fuera de un
 * `runWithRequestTenantId` (scripts sueltos, cron jobs que no lo envuelven,
 * tests) cae a DEFAULT_TENANT_ID — mismo comportamiento legacy de antes.
 */
export function getRequestTenantId(): string {
  return tenantContext.getStore() ?? DEFAULT_TENANT_ID;
}
