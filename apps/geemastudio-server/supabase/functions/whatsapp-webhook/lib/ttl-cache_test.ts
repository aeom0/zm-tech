import { assertEquals } from "@std/assert";
import { cachedLoad } from "./ttl-cache.ts";

Deno.test("cachedLoad guarda el acierto y no repite la carga", async () => {
  const cache = new Map<string, { value: number; at: number }>();
  const inflight = new Map<string, Promise<number>>();
  let calls = 0;
  const load = () => {
    calls += 1;
    return Promise.resolve({ value: 7, store: true });
  };

  assertEquals(await cachedLoad(cache, inflight, "k", 60_000, load), 7);
  assertEquals(await cachedLoad(cache, inflight, "k", 60_000, load), 7);
  assertEquals(calls, 1);
});

Deno.test("cachedLoad no guarda un fallo", async () => {
  const cache = new Map<string, { value: string; at: number }>();
  const inflight = new Map<string, Promise<string>>();
  let calls = 0;
  const load = () => {
    calls += 1;
    return Promise.resolve({ value: "vacio", store: false });
  };

  await cachedLoad(cache, inflight, "k", 60_000, load);
  await cachedLoad(cache, inflight, "k", 60_000, load);
  assertEquals(calls, 2);
});

Deno.test("cachedLoad comparte la carga en vuelo", async () => {
  const cache = new Map<string, { value: number; at: number }>();
  const inflight = new Map<string, Promise<number>>();
  let calls = 0;
  const load = () => {
    calls += 1;
    return new Promise<{ value: number; store: boolean }>((resolve) => {
      setTimeout(() => resolve({ value: 3, store: true }), 20);
    });
  };

  const [a, b] = await Promise.all([
    cachedLoad(cache, inflight, "k", 60_000, load),
    cachedLoad(cache, inflight, "k", 60_000, load),
  ]);
  assertEquals(a, 3);
  assertEquals(b, 3);
  assertEquals(calls, 1);
});
