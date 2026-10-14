import { assertEquals } from "@std/assert";

import { getSalonTimeSlots } from "./constants.ts";
import {
  getDateSelectorDescription,
  hydrateSalonHolidays,
} from "./peru-holidays.ts";

const fmt = (s: { hour: number; minute: number }) =>
  `${String(s.hour).padStart(2, "0")}:${String(s.minute).padStart(2, "0")}`;

// 2031-03-04/05/06 son martes a jueves (horario normal 10:00–17:30).
hydrateSalonHolidays([
  { date: "2031-03-04", is_closed: false, open_from_hour: 14, name: "Tarde" },
  {
    date: "2031-03-05",
    is_closed: false,
    open_from_hour: 12,
    open_until_hour: 15,
    name: "Franja",
  },
  {
    date: "2031-03-06",
    is_closed: false,
    open_from_hour: null,
    open_until_hour: null,
    name: "Sin recorte",
  },
]);

Deno.test("día especial solo de tarde: desde 14:00 hasta el cierre habitual", () => {
  const slots = getSalonTimeSlots(2, "2031-03-04").map(fmt);
  assertEquals(slots[0], "14:00");
  assertEquals(slots.at(-1), getSalonTimeSlots(2).map(fmt).at(-1));
  assertEquals(
    getDateSelectorDescription("2031-03-04"),
    "Horario especial — desde 2 PM",
  );
});

Deno.test("día especial con apertura y última cita: franja inclusiva", () => {
  const slots = getSalonTimeSlots(3, "2031-03-05").map(fmt);
  assertEquals(slots[0], "12:00");
  assertEquals(slots.at(-1), "15:00");
  assertEquals(
    getDateSelectorDescription("2031-03-05"),
    "Horario especial — de 12 PM a 3 PM",
  );
});

Deno.test("día especial sin horas: usa el horario habitual", () => {
  assertEquals(getSalonTimeSlots(4, "2031-03-06"), getSalonTimeSlots(4));
  assertEquals(getDateSelectorDescription("2031-03-06"), "Ver horarios");
});
