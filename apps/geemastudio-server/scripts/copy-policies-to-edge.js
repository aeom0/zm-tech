#!/usr/bin/env node
/**
 * Genera supabase/functions/whatsapp-webhook/lib/policies.ts desde policies-text/data.json.
 * Ejecutar antes de desplegar la edge function (yarn copy-policies).
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "policies-text/data.json");
const outPath = path.join(
  root,
  "supabase/functions/whatsapp-webhook/lib/policies.ts",
);

const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

function escapeForTs(str) {
  return str.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");
}

const categoryEntries = Object.entries(data.CONSIDERACIONES_PREVIAS_BY_CATEGORY)
  .map(([k, v]) => `  "${k}": \`${escapeForTs(v)}\`,`)
  .join("\n");

const content = `// policies.ts — Generado por scripts/copy-policies-to-edge.js desde policies-text/data.json
// No editar a mano; editar data.json y ejecutar: yarn copy-policies

export const CONSIDERACIONES_PREVIAS_BY_CATEGORY: Record<string, string> = {
${categoryEntries}
};

const CONSIDERACIONES_PREVIAS_HEADER = \`${escapeForTs(data.CONSIDERACIONES_PREVIAS_HEADER)}\`;

export function getConsideracionesPreviasWhatsApp(categoryIds: string[]): string {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const id of categoryIds) {
    const text = CONSIDERACIONES_PREVIAS_BY_CATEGORY[id];
    if (text && !seen.has(id)) {
      seen.add(id);
      lines.push(text);
    }
  }
  if (lines.length === 0) return "";
  return CONSIDERACIONES_PREVIAS_HEADER + lines.join("\\n\\n");
}

export function getPoliticasCitaWhatsApp(): string {
  return \`${escapeForTs(data.POLITICAS_CITA_WHATSAPP)}\`;
}
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, content, "utf8");
console.log(
  "OK: policies.ts generado en supabase/functions/whatsapp-webhook/lib/policies.ts",
);
console.log("   Ejecuta el deploy de la edge function cuando corresponda.");
process.exit(0);
