// QA S5-2 + S5-3: con reglas ZM hidratadas, slots/staff/pago == hardcode previo; otro tenant cambia sin deploy.
// Uso: deno run --allow-read scripts/waba-validate-tenant-rules-s5-2.ts
import {
  EMPLOYEE_CATEGORIES,
  MEDIOS_DE_PAGO,
  getEmployeeCategories,
  getMediosDePago,
  getSalonTimeSlots,
} from "../supabase/functions/whatsapp-webhook/lib/constants.ts";
import { DEFAULT_ZM_WABA_RULES } from "../supabase/functions/whatsapp-webhook/lib/tenant-rules.ts";
import {
  clearLoadedWabaRules,
  setLoadedWabaRules,
} from "../supabase/functions/whatsapp-webhook/lib/tenant-rules-store.ts";
import {
  classifyExtensionesLane,
  overlapCapForCart,
} from "../supabase/functions/whatsapp-webhook/lib/services-catalog.ts";
import { hasFlexibleMealBreak } from "../supabase/functions/whatsapp-webhook/lib/slot-occupation.ts";
import { getAdvancePaymentRate } from "../supabase/functions/whatsapp-webhook/lib/peru-holidays.ts";
import { runWithRequestTenantId } from "../supabase/functions/whatsapp-webhook/lib/tenant.ts";

let fail = 0;
const eq = (name: string, a: unknown, b: unknown) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) { fail++; console.error("FAIL", name, JSON.stringify(a), JSON.stringify(b)); }
  else console.log("ok  ", name);
};

const legacy = [0, 1, 2, 3, 4, 5, 6].map((d) => getSalonTimeSlots(d, "2030-01-01"));
setLoadedWabaRules("zm-lash-nails", DEFAULT_ZM_WABA_RULES);
[0, 1, 2, 3, 4, 5, 6].forEach((d) =>
  eq(`slots dow=${d}`, getSalonTimeSlots(d, "2030-01-01"), legacy[d]));
eq("staff", getEmployeeCategories(), EMPLOYEE_CATEGORIES);
eq("pago", getMediosDePago(), MEDIOS_DE_PAGO);
eq("domingo 20%", getAdvancePaymentRate("2030-01-06"), 0.2);

setLoadedWabaRules("otro", {
  ...DEFAULT_ZM_WABA_RULES,
  schedule: { weekday: { open: "09:00", close: "12:00" }, slotMinutes: [0] },
  deposit: { ...DEFAULT_ZM_WABA_RULES.deposit, sundayRate: 0.5 },
  staffByCategory: { "cat-x": ["emp-x"] },
  paymentMethodsText: "otro pago",
});
runWithRequestTenantId("otro", () => {
  eq("otro lunes", getSalonTimeSlots(1, "2030-01-07").map((s) => s.hour), [9, 10, 11]);
  eq("otro domingo cerrado", getSalonTimeSlots(0, "2030-01-06"), []);
  eq("otro staff", getEmployeeCategories(), { "cat-x": ["emp-x"] });
  eq("otro pago", getMediosDePago(), "otro pago");
  eq("otro domingo rate", getAdvancePaymentRate("2030-01-06"), 0.5);
});

// S5-3: capacidad. Catálogo mínimo (solo servicesById se consulta).
// deno-lint-ignore no-explicit-any
const cat: any = { servicesById: new Map([
  ["lift", { category_id: "cat-lifting" }],
  ["ext", { category_id: "cat-extensiones" }],
  ["anime", { category_id: "cat-extensiones" }],
  ["retiro", { category_id: "cat-extensiones" }],
]) };
setLoadedWabaRules("zm-lash-nails", DEFAULT_ZM_WABA_RULES);
eq("cap ZM lifting", overlapCapForCart(["lift"], cat), 2);
eq("cap ZM extensiones", overlapCapForCart(["ext"], cat), 1);
eq("lane ZM anime (uuid real)", classifyExtensionesLane("98772a98-f454-4722-a73f-8b2bab72bfa7", { servicesById: new Map([["98772a98-f454-4722-a73f-8b2bab72bfa7", { category_id: "cat-extensiones" }]]) } as never), "karelis");
setLoadedWabaRules("otro", {
  ...DEFAULT_ZM_WABA_RULES,
  capacity: {
    ...DEFAULT_ZM_WABA_RULES.capacity,
    defaultCap: 3, specialCap: 4,
    specialCategoryIds: ["cat-extensiones"],
    specialExtraServiceIds: [],
    extensionesKarelisServiceIds: ["anime"],
    unassignedCapServiceIds: ["retiro"],
  },
});
runWithRequestTenantId("otro", () => {
  eq("otro cap especial", overlapCapForCart(["ext"], cat), 4);
  eq("otro cap normal", overlapCapForCart(["lift"], cat), 3);
  eq("otro lane karelis", classifyExtensionesLane("anime", cat), "karelis");
  eq("otro lane retiro", classifyExtensionesLane("retiro", cat), null);
});
// Almuerzo: ZM 12:00–14:30/45 min. Cita 12:00–14:20 deja 10 min → no cabe; con almuerzo de 5 min sí.
const ap = [{ start: 10 * 60, end: 11 * 60 }];
const cand = { start: 12 * 60, end: 14 * 60 + 20 };
eq("almuerzo ZM no cabe", hasFlexibleMealBreak(ap, cand), false);
setLoadedWabaRules("otro", { ...DEFAULT_ZM_WABA_RULES, capacity: { ...DEFAULT_ZM_WABA_RULES.capacity, mealBreak: { startMinutes: 720, endMinutes: 870, durationMinutes: 5 } } });
runWithRequestTenantId("otro", () => eq("almuerzo otro cabe", hasFlexibleMealBreak(ap, cand), true));
clearLoadedWabaRules();
Deno.exit(fail ? 1 : 0);
