/**
 * Carga variables de .env en la raíz del monorepo (scripts de simulación WABA).
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function readEnvMap() {
  const env = { ...process.env };
  try {
    const raw = readFileSync(resolve(ROOT, ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // Cloud Agent: secrets inyectados en process.env sin .env en disco
  }
  return env;
}

export function loadEnvFromRoot() {
  const env = readEnvMap();
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const cronSecret = env.CRON_SECRET;
  if (!url || !serviceKey) {
    throw new Error(
      "Faltan EXPO_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env",
    );
  }
  return {
    url,
    serviceKey,
    cronSecret,
    webhookUrl: `${url}/functions/v1/whatsapp-webhook`,
  };
}

export { ROOT };
