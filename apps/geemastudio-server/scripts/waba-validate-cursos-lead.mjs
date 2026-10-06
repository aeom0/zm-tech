/**
 * Unit QA — curso extensiones vs pack clases (Johanna …9981).
 * Sin webhook ni cleanup.
 *
 * yarn waba:validate:cursos-lead
 */
import assert from "node:assert/strict";

function matchesClassesQuestion(lower) {
  return (
    /\bdictan?\s+clases?\b/.test(lower) ||
    /\bdan\s+clases?\b/.test(lower) ||
    /\bofrecen\s+clases?\b/.test(lower) ||
    /\bhay\s+clases?\b/.test(lower) ||
    /\bclases?\s+de\b/.test(lower) ||
    /\bcurso(s)?\b/.test(lower) ||
    /\bcapacitaci[oó]n\b/.test(lower) ||
    /\bcapacitan\b/.test(lower) ||
    /\bcertificad[oa]s?\b/.test(lower) ||
    lower.includes("enseñan") ||
    lower.includes("ensenan") ||
    lower.includes("enseñar") ||
    lower.includes("ensenar")
  );
}

function matchesExtensionesCursoLead(lower) {
  if (!matchesClassesQuestion(lower)) return false;
  if (/\b(lifting|cejas|laminado|planchado)\b/.test(lower)) return false;
  if (/\bcurso(s)?\b/.test(lower)) return true;
  const ascii = lower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/\b(pestan|extension)/.test(ascii)) return true;
  return false;
}

function matchesCursoLeadReply(lower) {
  return (
    /\bprincipiante\b/.test(lower) ||
    /\bnivel\s+medio\b/.test(lower) ||
    /\bintermedio\b/.test(lower) ||
    (/\bmedio\b/.test(lower) && lower.length <= 120)
  );
}

/** Mirror de booking-flow.looksLikeCursoLeadData (Anace: no basta ≥6 chars). */
function looksLikeCursoLeadData(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length >= 8) return true;
  const lines = trimmed
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.length >= 2 && trimmed.length >= 10;
}

function acceptsCursoLead(raw) {
  return (
    matchesCursoLeadReply(raw.toLowerCase()) || looksLikeCursoLeadData(raw)
  );
}

let failed = 0;
function check(name, cond) {
  try {
    assert.ok(cond, name);
    console.log(`  ✅ ${name}`);
  } catch (e) {
    failed++;
    console.error(`  ❌ ${name}: ${e.message}`);
  }
}

console.log("waba:validate:cursos-lead\n");

check(
  "Johanna: Inf sobre el curso → lead extensiones",
  matchesExtensionesCursoLead("inf sobre el curso ?"),
);
check(
  "curso de pestañas → lead",
  matchesExtensionesCursoLead("quiero info del curso de pestañas"),
);
check(
  "dictan clases → pack (no lead)",
  matchesClassesQuestion("hola, también dictan clases ?") &&
    !matchesExtensionesCursoLead("hola, también dictan clases ?"),
);
check(
  "clases de lifting → pack",
  matchesClassesQuestion("clases de lifting") &&
    !matchesExtensionesCursoLead("clases de lifting"),
);
check(
  "curso de lifting → pack (mención lifting)",
  matchesClassesQuestion("curso de lifting") &&
    !matchesExtensionesCursoLead("curso de lifting"),
);
check(
  "Johanna reply principiante",
  matchesCursoLeadReply("johanna cedeño \nprincipiante"),
);
check("nivel medio", matchesCursoLeadReply("maria lopez\nmedio"));
check(
  "Anace: 'Gracias' (≥6) NO acepta lead",
  !acceptsCursoLead("Gracias"),
);
check(
  "formulario multilínea + texto sí acepta",
  acceptsCursoLead("Ana Pérez\nprincipiante"),
);
check(
  "teléfono 9 dígitos sin nivel sí acepta",
  acceptsCursoLead("Ana Pérez 987654321"),
);

if (failed) {
  console.error(`\n${failed} fallos`);
  process.exit(1);
}
console.log("\nOK 10/10");
