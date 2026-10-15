import { assertEquals } from "@std/assert";
import {
  PAUSE_QUIET_RESUME_MS,
  pauseResumeReason,
} from "./pause-auto-resume.ts";

const H = 60 * 60 * 1000;
const base = {
  pausedAtMs: 0,
  lastStaffOutMs: null,
  completedAtMs: null,
  reclamo: false,
  nowMs: 1 * H,
};

Deno.test("pausa: sigue mientras el equipo atiende", () => {
  assertEquals(pauseResumeReason({ ...base, lastStaffOutMs: 0.5 * H }), null);
});

Deno.test("pausa: la cita completada después de la pausa la levanta", () => {
  assertEquals(
    pauseResumeReason({ ...base, lastStaffOutMs: 0, completedAtMs: 0.5 * H }),
    "cita_completada",
  );
});

Deno.test("pausa: si el equipo escribió después de completar, sigue", () => {
  assertEquals(
    pauseResumeReason({
      ...base,
      completedAtMs: 0.5 * H,
      lastStaffOutMs: 0.8 * H,
    }),
    null,
  );
});

Deno.test("pausa: 4 h sin el equipo la levanta", () => {
  assertEquals(
    pauseResumeReason({
      ...base,
      lastStaffOutMs: 1 * H,
      nowMs: 1 * H + PAUSE_QUIET_RESUME_MS,
    }),
    "sin_equipo_4h",
  );
});

Deno.test("pausa: un reclamo nunca se levanta solo", () => {
  assertEquals(
    pauseResumeReason({ ...base, reclamo: true, completedAtMs: 0.5 * H }),
    null,
  );
  assertEquals(
    pauseResumeReason({ ...base, reclamo: true, nowMs: 10 * H }),
    null,
  );
});
