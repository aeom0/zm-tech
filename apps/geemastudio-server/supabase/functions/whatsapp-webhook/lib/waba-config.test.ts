import { assertEquals } from "@std/assert";
import { getConfigText, type WabaConfigMap } from "./waba-config.ts";

Deno.test("getConfigText convierte \\n literal en salto de línea", () => {
  const cfg: WabaConfigMap = new Map([["k", { text: "Hola ✨\\nChao" }]]);
  assertEquals(getConfigText(cfg, "k", "x"), "Hola ✨\nChao");
});
