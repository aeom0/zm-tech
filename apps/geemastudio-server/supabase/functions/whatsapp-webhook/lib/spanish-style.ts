// spanish-style.ts — Regla de dialecto común para todo texto que genera Haiku
// (agente, saludo, reenganches, watchdog). El bot clásico la tiene en
// haiku-cms-defaults.ts; aquí va para los prompts que no pasan por el CMS.

export const SPANISH_STYLE_RULE =
  "Español neutro latinoamericano con tuteo (cuéntame, dime, mira). PROHIBIDO " +
  "el voseo (contame, decime, avisame, mirá, fijate) y los mexicanismos " +
  '("te late", "qué onda", "padrísimo", "órale", "chido"): usa "te gusta", ' +
  '"prefieres", "te llama la atención".';
