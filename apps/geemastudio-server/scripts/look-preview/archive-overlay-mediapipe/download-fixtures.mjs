#!/usr/bin/env node
/**
 * Descarga modelo MediaPipe, asset Anime del portafolio ZM y 10 selfies de prueba.
 * Uso: node scripts/look-preview/archive-overlay-mediapipe/download-fixtures.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const ANIME_PORTFOLIO_URL =
  "https://udelxwwnyivknslueerr.supabase.co/storage/v1/object/public/waba-images/portfolio/98772a98-f454-4722-a73f-8b2bab72bfa7/1.jpg";

/** Retratos frontales variados (Unsplash — solo spike interno QA). */
const SELFIE_URLS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=80",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800&q=80",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80",
  "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&q=80",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=80",
  "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800&q=80",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&q=80",
  "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&q=80",
];

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  console.log(`  ✓ ${dest}`);
}

async function main() {
  const dirs = [
    join(ROOT, "models"),
    join(ROOT, "assets"),
    join(ROOT, "fixtures", "selfies"),
    join(ROOT, "out", "landmarks"),
    join(ROOT, "out", "composites"),
    join(ROOT, "out", "overlays"),
  ];
  for (const d of dirs) await mkdir(d, { recursive: true });

  console.log("Descargando modelo Face Landmarker…");
  await download(MODEL_URL, join(ROOT, "models", "face_landmarker.task"));

  console.log("Descargando portafolio Anime…");
  await download(ANIME_PORTFOLIO_URL, join(ROOT, "assets", "anime-portfolio.jpg"));

  console.log("Descargando 10 selfies de prueba…");
  let i = 1;
  for (const url of SELFIE_URLS) {
    await download(url, join(ROOT, "fixtures", "selfies", `${String(i).padStart(2, "0")}.jpg`));
    i++;
  }

  console.log("\nFixtures listos.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
