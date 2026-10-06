#!/usr/bin/env node
/**
 * Spike / smoke — look-preview vía Vertex Gemini Image.
 * Requiere .env con GCP_SERVICE_ACCOUNT_BASE64 (yarn gcp:setup-vertex).
 *
 * Uso:
 *   yarn look-preview:vertex <selfie.jpg> [style_key|Anime]
 *   yarn look-preview:vertex …/avril-selfie.jpg anime
 *   yarn look-preview:vertex …/avril-selfie.jpg micro_doll_eye,fox,anime
 *
 * Si el 3.er arg es un style_key del seed (`scripts/look-preview/styles-seed-v1.json`),
 * usa VERTEX_READY_PROMPT completo; si no, prompt corto legacy.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const SEED_PATH = path.join(repoRoot, "scripts/look-preview/styles-seed-v1.json");
/** Log local de gasto (gitignored) — una línea JSON por imagen generada. */
const COST_LOG_PATH = path.join(repoRoot, "scripts/look-preview/vertex-cost-log.jsonl");
/** Precio listado Gemini 2.5 Flash Image: ~1290 tokens output ≈ USD 0.039 / imagen. */
const USD_PER_IMAGE_OUTPUT = 0.039;
const USD_PER_M_INPUT_TOKENS = 0.3;

function loadEnv() {
  const envPath = path.join(repoRoot, ".env");
  if (!fs.existsSync(envPath)) {
    throw new Error("Falta .env — corre: node scripts/setup-gcp-vertex-env.mjs");
  }
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i);
    let v = t.slice(i + 1);
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v.replace(/\\n/g, "\n");
  }
}

function loadSeed() {
  if (!fs.existsSync(SEED_PATH)) return new Map();
  const rows = JSON.parse(fs.readFileSync(SEED_PATH, "utf8"));
  return new Map(rows.map((r) => [r.style_key, r]));
}

function b64url(data) {
  return Buffer.from(data).toString("base64url");
}

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    sub: sa.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/cloud-platform",
  };
  const crypto = await import("node:crypto");
  const toSign = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(toSign);
  const signature = sign.sign(sa.private_key);
  const jwt = `${toSign}.${signature.toString("base64url")}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`OAuth: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

function buildLegacyPrompt(style) {
  return [
    `Using the provided selfie photo, change ONLY the eyelash extensions to a professional ${style} salon lash style.`,
    "Keep everything else exactly the same: skin, eyes, eyebrows, makeup, lighting, background.",
    "Photorealistic salon result.",
  ].join(" ");
}

/**
 * Gemini toma el aspect ratio de la ÚLTIMA imagen. Con ref recortada al final,
 * el output hereda el close-up y cambia el rostro. Selfie-last + swap de
 * "image (1)/(2)" en el prompt para que los números coincidan con el orden real.
 */
function swapImageOrdinals(prompt) {
  return prompt
    .replace(/image \(1\)/gi, "__IMG_A__")
    .replace(/image \(2\)/gi, "__IMG_B__")
    .replace(/\bfrom \(1\)/gi, "from (__ORD_A__)")
    .replace(/\bfrom \(2\)/gi, "from (__ORD_B__)")
    .replace(/__IMG_A__/g, "image (2)")
    .replace(/__IMG_B__/g, "image (1)")
    .replace(/__ORD_A__/g, "2")
    .replace(/__ORD_B__/g, "1");
}

const IDENTITY_LOCK_SELFIE_LAST = [
  "CRITICAL IMAGE ORDER: Image (1) is a lash STYLE close-up used only as a pattern guide.",
  "Image (2) is the client's original phone selfie — edit that photo.",
  "Keep image (2) pixel-faithful: same person, same crop, same vertical framing, forehead, hairline, head pose, eye shape, eyelids, iris, nose, mouth, moles, skin pores, uneven lighting and background.",
  "Change ONLY the upper eyelash fibers. Do not recrop or zoom into the eyes.",
  "Do not adopt image (1)'s landscape close-up. Do not beautify, airbrush, or relight the face.",
].join(" ");

/** Selfie + ref + selfie: Gemini hereda el ratio de la última (la selfie). */
const SANDWICH_LOCK = [
  "IMAGE ORDER: Image (1) is the client's original phone selfie — edit that photo.",
  "Image (2) is a lash STYLE close-up for UPPER spike count, spacing and rhythm only.",
  "Image (3) is the SAME selfie repeated: keep its exact aspect ratio, crop, framing, lighting and identity.",
  "The output MUST be the original selfie with only upper eyelash fibers changed.",
  "Do not recrop, zoom, or adopt image (2)'s landscape close-up. Do not beautify, airbrush, relight, or replace the face.",
  "Do not copy image (2)'s spike length — wearable salon fibers, not graphic black triangles.",
].join(" ");

async function fetchPortfolioRef(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Portfolio ref ${res.status}: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ct = (res.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
  const mimeType = ct.startsWith("image/") ? ct : "image/jpeg";
  return { b64: buf.toString("base64"), mimeType, bytes: buf.length, label: url };
}

function loadLocalRef(filePath) {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) throw new Error(`Ref local no existe: ${abs}`);
  const ext = path.extname(abs).toLowerCase();
  const mimeType =
    ext === ".png"
      ? "image/png"
      : ext === ".webp"
        ? "image/webp"
        : "image/jpeg";
  const buf = fs.readFileSync(abs);
  return { b64: buf.toString("base64"), mimeType, bytes: buf.length, label: abs };
}

async function runOne({
  selfiePath,
  styleKey,
  seed,
  sa,
  projectId,
  location,
  model,
  token,
  imageB64,
  portfolioRefPath,
  outSuffix,
  noPortfolioRef,
  selfieLast,
  identityLock,
  sandwich,
}) {
  const row = seed.get(styleKey);
  const prompt = row?.prompt_template ?? buildLegacyPrompt(styleKey);
  const label = row ? `${row.style_key} (${row.display_name})` : styleKey;
  console.log(`\n→ Vertex ${model} · ${label}`);
  console.log(`  prompt chars: ${prompt.length}${row ? " [seed]" : " [legacy]"}`);

  const selfiePart = { inlineData: { mimeType: "image/jpeg", data: imageB64 } };
  const parts = [];

  let refUrl = noPortfolioRef ? null : (row?.portfolio_image_url ?? null);
  let ref = null;
  if (portfolioRefPath) {
    ref = loadLocalRef(portfolioRefPath);
    refUrl = portfolioRefPath;
    console.log(`  + ref LOCAL: ${ref.label} (${ref.bytes} bytes)`);
  } else if (refUrl) {
    ref = await fetchPortfolioRef(refUrl);
    console.log(
      `  + ref portafolio: ${row.portfolio_caption || refUrl} (${ref.bytes} bytes)`,
    );
  } else {
    console.log(noPortfolioRef ? "  · sin ref (--no-ref)" : "  ⚠ sin portfolio_image_url en seed");
  }

  const refPart = ref
    ? { inlineData: { mimeType: ref.mimeType, data: ref.b64 } }
    : null;
  // Sandwich: selfie → ref → selfie (ratio e identidad de la selfie).
  // Selfie última sola: Gemini hereda su ratio. --ref-last = orden viejo (ratio de la ref).
  if (refPart && sandwich) {
    parts.push(selfiePart, refPart, selfiePart);
    console.log("  · orden: selfie → ref → selfie (--sandwich)");
  } else if (refPart && selfieLast) {
    parts.push(refPart, selfiePart);
    console.log("  · orden: ref → selfie (selfie last, lock de identidad)");
  } else if (refPart) {
    parts.push(selfiePart, refPart);
    console.log("  · orden: selfie → ref (--ref-last, ratio de la ref)");
  } else {
    parts.push(selfiePart);
  }

  // Sin 2.ª imagen: quitar instrucciones de image (2) para no confundir al modelo
  let promptText = prompt;
  if (!ref && /Image \(2\)|image \(2\)|second reference/i.test(prompt)) {
    promptText = `${prompt}\nNOTE: No style reference image is attached. Follow the written UPPER-lash spike map only. Lower lashes stay exactly as in this selfie.`;
  } else if (ref && sandwich) {
    promptText = `${SANDWICH_LOCK} ${prompt}`;
  } else if (ref && selfieLast) {
    const remapped = swapImageOrdinals(prompt);
    promptText = identityLock ? `${IDENTITY_LOCK_SELFIE_LAST} ${remapped}` : remapped;
  }
  parts.push({ text: promptText });

  // gemini-3.1-flash-image (y modelos nuevos) solo sirven por el endpoint global
  // (sin prefijo de región en el host); gemini-2.5-flash-image sigue regional.
  const host =
    location === "global"
      ? "aiplatform.googleapis.com"
      : `${location}-aiplatform.googleapis.com`;
  const url =
    `https://${host}/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;

  const t0 = Date.now();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
    }),
  });

  if (!res.ok) {
    throw new Error(`Vertex ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const latencyMs = Date.now() - t0;
  const usage = data.usageMetadata ?? data.usage_metadata ?? null;
  const outParts = data.candidates?.[0]?.content?.parts ?? [];
  const outDir = path.join(__dirname, "out", "vertex");
  fs.mkdirSync(outDir, { recursive: true });
  const base = path.basename(selfiePath, path.extname(selfiePath));
  const safeKey = styleKey.replace(/[^a-z0-9_-]/gi, "_");
  const suffix = outSuffix ? `_${outSuffix.replace(/[^a-z0-9_-]/gi, "_")}` : "";
  let saved = null;
  let imagesOut = 0;

  for (const part of outParts) {
    if (part.text) console.log("  Modelo:", part.text.slice(0, 200));
    if (part.inlineData?.data) {
      const outPath = path.join(outDir, `${base}_${safeKey}${suffix}.png`);
      fs.writeFileSync(outPath, Buffer.from(part.inlineData.data, "base64"));
      saved = outPath;
      imagesOut += 1;
      console.log(`  ✓ ${outPath} (${latencyMs} ms)`);
    }
  }
  if (!saved) console.warn("  ⚠ sin imagen en respuesta");

  const promptTokens = Number(usage?.promptTokenCount ?? usage?.prompt_token_count ?? 0);
  const candidatesTokens = Number(
    usage?.candidatesTokenCount ?? usage?.candidates_token_count ?? 0,
  );
  const inputUsd = (promptTokens / 1_000_000) * USD_PER_M_INPUT_TOKENS;
  const outputUsd =
    imagesOut > 0
      ? imagesOut * USD_PER_IMAGE_OUTPUT
      : (candidatesTokens / 1_000_000) * 30; // fallback listado $30/1M output image tokens
  const estimatedUsd = Number((inputUsd + outputUsd).toFixed(5));

  const entry = {
    ts: new Date().toISOString(),
    source: "vertex-preview.mjs",
    project_id: projectId,
    model,
    style_key: styleKey,
    has_portfolio_ref: Boolean(refUrl),
    latency_ms: latencyMs,
    images_out: imagesOut,
    prompt_token_count: promptTokens || null,
    candidates_token_count: candidatesTokens || null,
    estimated_usd: estimatedUsd,
    usd_per_image_list: USD_PER_IMAGE_OUTPUT,
  };
  fs.mkdirSync(path.dirname(COST_LOG_PATH), { recursive: true });
  fs.appendFileSync(COST_LOG_PATH, `${JSON.stringify(entry)}\n`);
  console.log(
    `  💰 ~USD ${estimatedUsd.toFixed(4)} (lista ${USD_PER_IMAGE_OUTPUT}/img` +
      `${promptTokens ? ` + input ${promptTokens} tok` : ""}) → log ${path.relative(repoRoot, COST_LOG_PATH)}`,
  );

  return { saved, estimatedUsd };
}

function summarizeCostLog() {
  if (!fs.existsSync(COST_LOG_PATH)) return;
  const lines = fs.readFileSync(COST_LOG_PATH, "utf8").trim().split("\n").filter(Boolean);
  let total = 0;
  let n = 0;
  for (const line of lines) {
    try {
      const row = JSON.parse(line);
      if (typeof row.estimated_usd === "number") {
        total += row.estimated_usd;
        n += 1;
      }
    } catch {
      /* skip */
    }
  }
  console.log(
    `\n📊 Cost log local: ${n} llamadas · ~USD ${total.toFixed(3)} acumulado (${path.relative(repoRoot, COST_LOG_PATH)})`,
  );
  console.log(
    "   Saldo créditos $300: Consola → Billing → Credits (API no expone créditos trial).",
  );
}

function parseArgs(argv) {
  const positional = [];
  let portfolioRefPath = process.env.LOOK_PREVIEW_REF || null;
  let outSuffix = process.env.LOOK_PREVIEW_OUT_SUFFIX || null;
  let noPortfolioRef = process.env.LOOK_PREVIEW_NO_REF === "1";
  let selfieLast = process.env.LOOK_PREVIEW_SELFIE_LAST === "1";
  let identityLock = process.env.LOOK_PREVIEW_NO_LOCK !== "1";
  let sandwich = process.env.LOOK_PREVIEW_SANDWICH === "1";
  for (const a of argv) {
    if (a.startsWith("--ref=")) portfolioRefPath = a.slice("--ref=".length);
    else if (a.startsWith("--suffix=")) outSuffix = a.slice("--suffix=".length);
    else if (a === "--no-ref") noPortfolioRef = true;
    else if (a === "--ref-last") selfieLast = false;
    else if (a === "--selfie-last") selfieLast = true;
    else if (a === "--sandwich") sandwich = true;
    else if (a === "--no-lock") identityLock = false;
    else if (a === "--help" || a === "-h") positional.push(a);
    else positional.push(a);
  }
  return { positional, portfolioRefPath, outSuffix, noPortfolioRef, selfieLast, identityLock, sandwich };
}

async function main() {
  loadEnv();
  const { positional, portfolioRefPath, outSuffix, noPortfolioRef, selfieLast, identityLock, sandwich } = parseArgs(process.argv.slice(2));
  const selfiePath = positional[0];
  const stylesArg = positional[1] ?? "anime";
  if (!selfiePath || positional.includes("--help") || positional.includes("-h")) {
    console.error(
      "Uso: node …/vertex-preview.mjs <selfie.jpg> [style_key[,…]] [--ref=ruta.jpg] [--no-ref] [--sandwich|--selfie-last|--ref-last] [--suffix=tag]",
    );
    process.exit(selfiePath ? 0 : 1);
  }
  if (!fs.existsSync(selfiePath)) {
    throw new Error(`No existe selfie: ${selfiePath}`);
  }

  const b64env = process.env.GCP_SERVICE_ACCOUNT_BASE64;
  if (!b64env) throw new Error("Falta GCP_SERVICE_ACCOUNT_BASE64 en .env");

  const sa = JSON.parse(Buffer.from(b64env, "base64").toString("utf8"));
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID ?? sa.project_id;
  const location = process.env.GCP_LOCATION ?? "global";
  const model = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image";
  const seed = loadSeed();
  const styles = stylesArg.split(",").map((s) => s.trim()).filter(Boolean);
  const imageB64 = fs.readFileSync(selfiePath).toString("base64");
  const token = await getAccessToken(sa);

  console.log(`Proyecto ${projectId} @ ${location}`);
  console.log(`Selfie: ${selfiePath}`);
  console.log(`Estilos: ${styles.join(", ")}`);
  if (portfolioRefPath) console.log(`Ref override: ${portfolioRefPath}`);
  if (noPortfolioRef) console.log("Ref: OFF (--no-ref)");
  if (!noPortfolioRef) {
    if (sandwich) console.log("Orden: selfie → ref → selfie (--sandwich)");
    else console.log(selfieLast ? "Orden: ref → selfie (--selfie-last)" : "Orden: selfie → ref (default)");
    if (selfieLast && !identityLock && !sandwich) console.log("Lock identidad: OFF (--no-lock)");
  }

  let runUsd = 0;
  for (const styleKey of styles) {
    const result = await runOne({
      selfiePath,
      styleKey,
      seed,
      sa,
      projectId,
      location,
      model,
      token,
      imageB64,
      portfolioRefPath: noPortfolioRef ? null : portfolioRefPath,
      outSuffix,
      noPortfolioRef,
      selfieLast: sandwich ? false : selfieLast,
      identityLock,
      sandwich,
    });
    runUsd += result?.estimatedUsd ?? 0;
  }
  console.log(`\nEsta corrida: ~USD ${runUsd.toFixed(4)}`);
  summarizeCostLog();
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
