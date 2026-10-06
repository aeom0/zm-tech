import { assertEquals } from "@std/assert";
import { employeeRulesAllowSlot } from "./employee-availability.ts";
import type { SupabaseClient } from "./supabase.ts";

function fakeClient(
  result: { data?: unknown; error?: { message: string } | null },
  calls: { n: number },
): SupabaseClient {
  return {
    rpc: () => {
      calls.n++;
      return Promise.resolve({
        data: result.data ?? null,
        error: result.error ?? null,
      });
    },
  } as unknown as SupabaseClient;
}

Deno.test("sin reglas configuradas deja pasar", async () => {
  const c = { n: 0 };
  const sb = fakeClient({ data: { configured: false, slots: [] } }, c);
  assertEquals(
    await employeeRulesAllowSlot(sb, "2030-01-01", "10:00", ["a"]),
    true,
  );
});

Deno.test("configurado: solo pasa lo que el motor ofrece", async () => {
  const c = { n: 0 };
  const sb = fakeClient({
    data: { configured: true, slots: ["13:00", "14:00"] },
  }, c);
  assertEquals(
    await employeeRulesAllowSlot(sb, "2030-01-02", "14:00", ["b"]),
    true,
  );
  assertEquals(
    await employeeRulesAllowSlot(sb, "2030-01-02", "11:00", ["b"]),
    false,
  );
  assertEquals(c.n, 1, "cache: una sola consulta por dia y carrito");
});

Deno.test("error del RPC no bloquea", async () => {
  const c = { n: 0 };
  const sb = fakeClient({ error: { message: "boom" } }, c);
  assertEquals(
    await employeeRulesAllowSlot(sb, "2030-01-03", "10:00", ["c"]),
    true,
  );
});

Deno.test("inicio fuera de la grilla de 15 min o carrito vacio no consulta", async () => {
  const c = { n: 0 };
  const sb = fakeClient({ data: { configured: true, slots: [] } }, c);
  assertEquals(
    await employeeRulesAllowSlot(sb, "2030-01-04", "10:10", ["d"]),
    true,
  );
  assertEquals(
    await employeeRulesAllowSlot(sb, "2030-01-04", "10:00", []),
    true,
  );
  assertEquals(c.n, 0);
});

Deno.test("reprogramar: envia la cita excluida al RPC y la separa en cache", async () => {
  const args: Record<string, unknown>[] = [];
  const sb = {
    rpc: (_n: string, a: Record<string, unknown>) => {
      args.push(a);
      return Promise.resolve({
        data: { configured: true, slots: ["13:00"] },
        error: null,
      });
    },
  } as unknown as SupabaseClient;
  await employeeRulesAllowSlot(sb, "2030-01-06", "13:00", ["e"], "apt-1");
  await employeeRulesAllowSlot(sb, "2030-01-06", "13:00", ["e"]);
  assertEquals(args.length, 2);
  assertEquals(args[0].p_exclude_appointment_id, "apt-1");
  assertEquals(args[1].p_exclude_appointment_id, null);
});
