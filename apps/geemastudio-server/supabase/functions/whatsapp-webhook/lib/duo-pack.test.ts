import {
  collapseSlotsToClientHours,
  confirmsTwoPersonPack,
  formatHourCompact,
  isTwoPersonSameServiceIds,
  textInterruptsCompanionName,
} from "./duo-pack.ts";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

Deno.test("pack de 2 es el mismo servicio repetido", () => {
  assert(
    isTwoPersonSameServiceIds(["lift", "lift"]),
    "dos iguales",
  );
  assert(!isTwoPersonSameServiceIds(["lift", "cejas"]), "servicios distintos");
  assert(!isTwoPersonSameServiceIds(["lift"]), "uno solo");
});

Deno.test("la lista a la clienta queda en punto", () => {
  const collapsed = collapseSlotsToClientHours([
    { hour: 10, minute: 0 },
    { hour: 10, minute: 30 },
    { hour: 11, minute: 0 },
    { hour: 17, minute: 30 },
  ]);
  assert(collapsed.length === 3, "tres horas");
  assert(collapsed[0].hour === 10 && collapsed[0].minute === 0, "10 en punto");
  assert(
    collapsed[2].hour === 17 && collapsed[2].minute === 30,
    "solo la media",
  );
  assert(formatHourCompact(10, 0) === "10 AM", "10 AM");
  assert(formatHourCompact(17, 0) === "5 PM", "5 PM");
  assert(formatHourCompact(17, 30) === "5:30 PM", "5:30 sigue visible");
});

Deno.test("ubicación y cupo no son un nombre", () => {
  assert(textInterruptsCompanionName("Donde están ubicados"), "ubicación");
  assert(textInterruptsCompanionName("Tiene cupo mañana"), "cupo");
  assert(textInterruptsCompanionName("A las 5"), "hora");
  assert(!textInterruptsCompanionName("María López"), "nombre");
  assert(
    textInterruptsCompanionName("Y tiene servicios de uñas también"),
    "pregunta de uñas",
  );
  assert(confirmsTwoPersonPack("Me gusta el pack de 2"), "confirma pack");
  assert(!confirmsTwoPersonPack("Qué es lifting"), "pregunta suelta");
});
