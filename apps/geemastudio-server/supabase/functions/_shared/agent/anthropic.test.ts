import { assertEquals } from "@std/assert";
import { callMessagesApi } from "./anthropic.ts";

const base = { system: [], messages: [], tools: [] };

Deno.test("callMessagesApi usa la key que recibe y lee el uso", async () => {
  let sentKey: string | null = null;
  const fetchImpl = ((_url: string, init: RequestInit) => {
    sentKey = new Headers(init.headers).get("x-api-key");
    return Promise.resolve(
      new Response(
        JSON.stringify({
          content: [{ type: "text", text: "hola" }],
          stop_reason: "end_turn",
          usage: { input_tokens: 10, output_tokens: 3 },
        }),
      ),
    );
  }) as typeof fetch;
  const res = await callMessagesApi({
    ...base,
    apiKey: "k-soporte",
    fetchImpl,
  });
  assertEquals(sentKey, "k-soporte");
  assertEquals(res?.stopReason, "end_turn");
  assertEquals(res?.inputTokens, 10);
  assertEquals(res?.cacheReadInputTokens, 0);
});

Deno.test("callMessagesApi avisa el error HTTP y devuelve null", async () => {
  const errors: Array<[number, string]> = [];
  const fetchImpl = (() =>
    Promise.resolve(
      new Response("credit balance is too low", { status: 400 }),
    )) as typeof fetch;
  const res = await callMessagesApi({
    ...base,
    apiKey: "k",
    fetchImpl,
    onApiError: (status, body) => errors.push([status, body]),
  });
  assertEquals(res, null);
  assertEquals(errors, [[400, "credit balance is too low"]]);
});
