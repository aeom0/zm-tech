/**
 * Unit: detección fibras/SKU para portafolio multi (Nicole 3D+rimel+foxy).
 * yarn node scripts/waba-validate-lash-fibers.mjs
 */
import assert from "node:assert/strict";

function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const LASH_FIBER_DETECT = [
  { key: "4d", re: /\b4d\b|volumen\s*tec\w*\s*4/ },
  { key: "3d", re: /\b3d\b|baby\s*vol|volumen\s*tec\w*\s*3/ },
  { key: "fox", re: /\bfoxy?\b/ },
  { key: "rimel", re: /\brimel\b/ },
  { key: "mojado", re: /\bmojado\b|\bhumedo\b|\bwet\b/ },
  { key: "clasicas", re: /\bclasic/ },
  { key: "anime", re: /\banime\b/ },
  { key: "hawaiana", re: /\bhawaian/ },
  { key: "mega", re: /\bmega\s*vol/ },
  { key: "wispy", re: /\bwispy\b/ },
];

function detectLashFiberKeys(text) {
  const t = normalizeText(text);
  if (!t.trim()) return [];
  const found = [];
  for (const { key, re } of LASH_FIBER_DETECT) {
    if (re.test(t) && !found.includes(key)) found.push(key);
  }
  return found;
}

function scoreIndexEntryForFiber(key, entry) {
  const name = normalizeText(entry.serviceName);
  const cap = normalizeText(entry.caption);
  if (/retoque/.test(name)) return 0;
  switch (key) {
    case "3d":
      if (/\b4d\b/.test(name)) return 0;
      if (/\b3d\b/.test(name) || /baby\s*vol/.test(name)) return 50;
      return 0;
    case "4d":
      return /\b4d\b/.test(name) ? 50 : 0;
    case "fox":
      return /\bfox\b/.test(name) || /\bfox\b/.test(cap) ? 50 : 0;
    case "rimel":
      return /rimel/.test(name) || /rimel/.test(cap) ? 50 : 0;
    default:
      return 0;
  }
}

function pickBest(key, index) {
  let best = null;
  let bestScore = 0;
  for (const entry of index) {
    const score = scoreIndexEntryForFiber(key, entry);
    if (score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }
  return best;
}

function pickSlots(keys, index) {
  const slots = [];
  const used = new Set();
  for (const key of keys) {
    const entry = pickBest(key, index);
    if (!entry || used.has(entry.serviceId)) continue;
    used.add(entry.serviceId);
    slots.push(entry.serviceName);
  }
  return slots;
}

const index = [
  {
    serviceId: "rimel",
    serviceName: "Extensiones Rímel",
    caption: "Rímel // Diseño Ojo de gato",
    sortOrder: 0,
  },
  {
    serviceId: "rimel",
    serviceName: "Extensiones Rímel",
    caption: "Rímel // Diseño Ardilla",
    sortOrder: 1,
  },
  {
    serviceId: "3d",
    serviceName: "Baby Vol. Tecnológica 3D",
    caption: "Efecto: Ojo de gato",
    sortOrder: 0,
  },
  {
    serviceId: "fox",
    serviceName: "Fox",
    caption: "Fox // Ojo de gato",
    sortOrder: 0,
  },
  {
    serviceId: "retoque",
    serviceName: "Retoque Baby Vol. Tec 3D",
    caption: "Retoque Vol. Tec. 3D",
    sortOrder: 0,
  },
];

const nicole =
  "Me podria mandar fotos referenciales de las 3D, el efecto rimel y foxy porfavor";
const keys = detectLashFiberKeys(nicole);
assert.deepEqual(keys.sort(), ["3d", "fox", "rimel"].sort());
const slots = pickSlots(keys, index);
assert.equal(slots.length, 3);
assert.ok(slots.includes("Baby Vol. Tecnológica 3D"));
assert.ok(slots.includes("Extensiones Rímel"));
assert.ok(slots.includes("Fox"));
assert.ok(!slots.includes("Retoque Baby Vol. Tec 3D"));

assert.deepEqual(detectLashFiberKeys("fotos del foxy"), ["fox"]);
assert.deepEqual(detectLashFiberKeys("quiero baby vol"), ["3d"]);

console.log("OK waba-validate-lash-fibers");
