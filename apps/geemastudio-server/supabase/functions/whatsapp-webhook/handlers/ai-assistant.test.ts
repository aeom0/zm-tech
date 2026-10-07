import { parseAIResponse } from "./ai-assistant.ts";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

Deno.test("confirm_booking:HH:MM conserva la hora de Haiku", () => {
  const r = parseAIResponse(
    "<text>Dame un momento 💜</text>\n<action>confirm_booking:17:00</action>",
  );
  assert(r.action?.type === "confirm_booking", "tipo");
  assert(r.action?.param === "17:00", `param ${r.action?.param}`);
});

Deno.test("confirm_booking a secas no trae param y hora inválida se ignora", () => {
  const a = parseAIResponse(
    "<text>ok</text>\n<action>confirm_booking</action>",
  );
  assert(a.action?.type === "confirm_booking" && !a.action.param, "a secas");
  const b = parseAIResponse(
    "<text>ok</text>\n<action>confirm_booking:27:00</action>",
  );
  assert(b.action?.type !== "confirm_booking" || !b.action.param, "inválida");
});
