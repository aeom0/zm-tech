#!/usr/bin/env node
/**
 * Configura variables GCP/Vertex en .env local desde un JSON de service account.
 * Uso: node scripts/setup-gcp-vertex-env.mjs [ruta-al.json]
 *
 * NO commitea secretos. El JSON de Descargas queda copiado en ~/.config/gcp/.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const DEFAULT_JSON =
  "/mnt/c/Users/alber/Downloads/project-7ab5aba0-0904-4cb9-a65-105f9692be3a.json";

const jsonPath = process.argv[2] ?? DEFAULT_JSON;
const repoRoot = path.resolve(import.meta.dirname, "..");
const envPath = path.join(repoRoot, ".env");
const configDir = path.join(os.homedir(), ".config", "gcp");
const configJsonPath = path.join(configDir, "zm-vertex-sa.json");

if (!fs.existsSync(jsonPath)) {
  console.error(`No se encontró el JSON en: ${jsonPath}`);
  console.error("Pasa la ruta como argumento: node scripts/setup-gcp-vertex-env.mjs /ruta/sa.json");
  process.exit(1);
}

const sa = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const required = ["project_id", "client_email", "private_key"];
for (const k of required) {
  if (!sa[k]) {
    console.error(`JSON inválido: falta ${k}`);
    process.exit(1);
  }
}

fs.mkdirSync(configDir, { recursive: true });
fs.copyFileSync(jsonPath, configJsonPath);
fs.chmodSync(configJsonPath, 0o600);

const base64 = Buffer.from(JSON.stringify(sa)).toString("base64");
const privateKeyEscaped = sa.private_key.replace(/\n/g, "\\n");

const entries = {
  GOOGLE_APPLICATION_CREDENTIALS: configJsonPath,
  GOOGLE_CLOUD_PROJECT_ID: sa.project_id,
  GOOGLE_CLIENT_EMAIL: sa.client_email,
  GOOGLE_PRIVATE_KEY: `"${privateKeyEscaped}"`,
  GCP_SERVICE_ACCOUNT_BASE64: base64,
  GCP_LOCATION: "us-central1",
  GEMINI_IMAGE_MODEL: "gemini-2.5-flash-image",
};

function upsertEnvFile(filePath, vars) {
  const lines = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, "utf8").split("\n")
    : [];
  const pending = new Set(Object.keys(vars));
  const out = [];
  let hasVertexSection = false;

  for (const line of lines) {
    if (line.includes("Vertex AI (look-preview)")) hasVertexSection = true;
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=/);
    if (m && pending.has(m[1])) {
      out.push(`${m[1]}=${vars[m[1]]}`);
      pending.delete(m[1]);
      continue;
    }
    out.push(line);
  }

  if (pending.size > 0) {
    if (!hasVertexSection) out.push("", "# --- Vertex AI (look-preview) ---");
    for (const key of Object.keys(vars)) {
      if (pending.has(key)) out.push(`${key}=${vars[key]}`);
    }
  }

  fs.writeFileSync(filePath, out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n");
}

upsertEnvFile(envPath, entries);

console.log("✓ Credenciales GCP configuradas");
console.log(`  project_id:    ${sa.project_id}`);
console.log(`  client_email:  ${sa.client_email}`);
console.log(`  JSON copiado:  ${configJsonPath}`);
console.log(`  .env actualizado: ${envPath}`);
console.log("");
console.log("Siguiente paso — Supabase Dashboard → Edge Functions → Secrets:");
console.log("  GCP_SERVICE_ACCOUNT_BASE64 = (mismo valor que en .env)");
console.log("  GCP_LOCATION = us-central1");
console.log("  GEMINI_IMAGE_MODEL = gemini-2.5-flash-image");
console.log("");
console.log("Probar: yarn look-preview:vertex scripts/look-preview/fixtures/selfies/01.jpg");
