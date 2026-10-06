import { assertEquals } from "@std/assert";
import {
  runWithRequestTenantId,
  getRequestTenantId,
  DEFAULT_TENANT_ID,
} from "./tenant.ts";

Deno.test(
  "aisla contexto entre invocaciones concurrentes interleaved",
  async () => {
    const results: Record<string, string> = {};
    await Promise.all([
      runWithRequestTenantId("tenant-a", async () => {
        await new Promise((r) => setTimeout(r, 30));
        results.a = getRequestTenantId();
      }),
      runWithRequestTenantId("tenant-b", () => {
        results.b = getRequestTenantId();
      }),
    ]);
    assertEquals(results.a, "tenant-a");
    assertEquals(results.b, "tenant-b");
  },
);

Deno.test("fuera de runWithRequestTenantId cae a DEFAULT_TENANT_ID", () => {
  assertEquals(getRequestTenantId(), DEFAULT_TENANT_ID);
});
