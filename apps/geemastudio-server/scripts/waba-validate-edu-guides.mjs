/**
 * Unit: guías educativas pelo a pelo / fichas fibra / mapping.
 * yarn node scripts/waba-validate-edu-guides.mjs
 */
import assert from "node:assert/strict";

function norm(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function matchesPeloAPeloExplainIntent(text) {
  const t = norm(text ?? "");
  if (!t) return false;
  if (/pelo\s*(a|por|x)\s*pelo/.test(t)) return true;
  if (/1\s*(a|por|x|:)\s*1/.test(t) && /(pestan|extension|fibra)/.test(t)) {
    return true;
  }
  if (
    /(como\s+funcion|que\s+es|que\s+son|explic)/.test(t) &&
    /(pestan|extension)/.test(t) &&
    /(pelo|fibra|una\s+a\s+una|1\s*a\s*1)/.test(t)
  ) {
    return true;
  }
  return false;
}

function matchesMappingExplainIntent(text) {
  const t = norm(text ?? "");
  if (!t) return false;
  if (/\b(mapping|mapeo|mapas?\s+de\s+longitud)/.test(t)) return true;
  if (
    /\b(disenos?|diseños?)\b/.test(t) &&
    /(pestan|extension|ojo|gato|ardilla|muneca|abierto|clasic|rimel|3d|4d)/.test(
      t,
    )
  ) {
    return true;
  }
  if (
    /(ver|mostrar|pasan|pasa|mandan|manda)\s+(los\s+)?(disenos?|diseños?|mapas?)/.test(
      t,
    )
  ) {
    return true;
  }
  return false;
}

function pickMappingTechnique(text, cartServiceNames = []) {
  const blob = norm([text, ...cartServiceNames].filter(Boolean).join(" "));
  if (!blob) return null;
  if (/\b(4d|volumen\s*tec.*4|baby\s*vol.*4)\b/.test(blob)) return "4d";
  if (/\b(3d|volumen\s*tec.*3|baby\s*vol)\b/.test(blob)) return "3d";
  if (/\b(mojado|humedo|wet)\b/.test(blob)) return "mojado";
  if (/\brimel\b/.test(blob)) return "rimel";
  if (/\bclasic/.test(blob)) return "clasicas";
  return null;
}

function fiberKindForTechnique(tech) {
  if (tech === "mojado") return "mapping_mojado";
  if (tech === "clasicas") return "fiber_clasicas";
  return `fiber_${tech}`;
}

function mappingKindForTechnique(tech) {
  if (tech === "clasicas") return "mapping_clasicas";
  return `mapping_${tech}`;
}

function matchesFiberCardIntent(text) {
  const t = norm(text ?? "");
  if (!t || !pickMappingTechnique(t)) return false;
  return /(foto|ver|mostrar|mand|pas|referenc|explic|que\s+es|como\s+es|ficha|info|precio|cuanto|estilo|queda)/.test(
    t,
  );
}

function matchesFiberCompareGuideIntent(text) {
  const t = norm(text ?? "");
  if (!t) return false;
  let n = 0;
  if (/\b4d\b|volumen\s*tec\w*\s*4/.test(t)) n++;
  if (/\b3d\b|baby\s*vol|volumen\s*tec\w*\s*3/.test(t)) n++;
  if (/\brimel\b/.test(t)) n++;
  if (/\bfoxy?\b/.test(t)) n++;
  if (/\bclasic/.test(t)) n++;
  if (/\bmojado\b|\bhumedo\b|\bwet\b/.test(t)) n++;
  if (/\banime\b|\bhawaian|\bwispy\b|\bmega\s*vol/.test(t)) n++;
  if (n < 2) return false;
  return /(foto|ver|mostrar|mand|pas|diferenc|compar|estilo|queda|tipo\s+de\s+fibra|referenc)/.test(
    t,
  );
}

function pickEduGuideToSend(text, cartServiceNames = []) {
  if (matchesPeloAPeloExplainIntent(text)) {
    if (matchesMappingExplainIntent(text)) {
      const tech = pickMappingTechnique(text, cartServiceNames);
      if (tech) return fiberKindForTechnique(tech);
    }
    return "pelo_a_pelo";
  }
  if (matchesFiberCompareGuideIntent(text)) {
    return "pelo_a_pelo";
  }
  const tech = pickMappingTechnique(text, cartServiceNames);
  const t = norm(text ?? "");
  const wantsMappingSheet = /\b(mapping|mapeo|mapas?\s+de\s+longitud)\b/.test(t);
  if (matchesMappingExplainIntent(text) || matchesFiberCardIntent(text)) {
    if (tech) {
      return wantsMappingSheet
        ? mappingKindForTechnique(tech)
        : fiberKindForTechnique(tech);
    }
    return "pelo_a_pelo";
  }
  return null;
}

assert.equal(matchesPeloAPeloExplainIntent("son pelo a pelo?"), true);
assert.equal(pickEduGuideToSend("¿son pelo a pelo?"), "pelo_a_pelo");
assert.equal(
  pickEduGuideToSend("quiero ver los diseños del 3D"),
  "fiber_3d",
);
assert.equal(
  pickEduGuideToSend("muéstrame el mapping", ["Baby Vol. Tecnológica 3D"]),
  "mapping_3d",
);
assert.equal(
  pickEduGuideToSend("diseños rímel ojo de gato"),
  "fiber_rimel",
);
assert.equal(pickEduGuideToSend("fotos del 3D porfa"), "fiber_3d");
assert.equal(
  pickEduGuideToSend(
    "Me podria mandar fotos referenciales de las 3D, el efecto rimel y foxy porfavor",
  ),
  "pelo_a_pelo",
);
assert.equal(pickEduGuideToSend("hola buenos días"), null);

console.log("edu-guides unit: OK");
