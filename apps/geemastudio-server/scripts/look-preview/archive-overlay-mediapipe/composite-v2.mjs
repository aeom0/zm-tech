#!/usr/bin/env node
/**
 * Compositor v2 — clusters a lo largo del arco del párpado superior (no tira central).
 * Salida: out/composites-v2/
 */
import { readdir, readFile, writeFile, mkdir, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const LEFT_UPPER_LID = [33, 246, 161, 160, 159, 158, 157, 173, 133];
const RIGHT_UPPER_LID = [263, 466, 388, 387, 386, 385, 384, 398, 362];

function pt(landmarks, idx, w, h) {
  return { x: landmarks[idx].x * w, y: landmarks[idx].y * h };
}

function interEyePx(landmarks, w, h) {
  const a = pt(landmarks, 133, w, h);
  const b = pt(landmarks, 362, w, h);
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Puntos de colocación: submuestreo del arco (evita saturar). */
function lidPlacementPoints(landmarks, indices, w, h) {
  const raw = indices.map((i) => pt(landmarks, i, w, h));
  const step = raw.length > 6 ? 2 : 1;
  const picked = [];
  for (let i = 0; i < raw.length; i += step) {
    picked.push({ ...raw[i], idx: i });
  }
  return picked;
}

async function renderClusterAt(clusterBuf, x, y, angleDeg, scale, liftPx) {
  const meta = await sharp(clusterBuf).metadata();
  const bw = meta.width ?? 48;
  const bh = meta.height ?? 36;
  const tw = Math.max(12, Math.round(bw * scale));
  const th = Math.max(10, Math.round(bh * scale));

  const processed = await sharp(clusterBuf)
    .resize(tw, th, { fit: "fill" })
    .ensureAlpha()
    .rotate(angleDeg, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const pm = await sharp(processed).metadata();
  const rw = pm.width ?? tw;
  const rh = pm.height ?? th;

  return {
    input: processed,
    left: Math.round(x - rw / 2),
    top: Math.round(y - rh * 0.85 - liftPx),
    blend: "over",
  };
}

async function buildEyeLayers(landmarks, upperLid, clusterBuf, w, h, eyeSpanPx) {
  const points = lidPlacementPoints(landmarks, upperLid, w, h);
  const layers = [];
  const baseScale = Math.max(0.35, Math.min(0.85, eyeSpanPx / 180));
  const lift = Math.max(2, eyeSpanPx * 0.04);

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const next = points[Math.min(i + 1, points.length - 1)];
    const prev = points[Math.max(i - 1, 0)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

    // Picos Anime: más largo en centro del arco
    const t = i / Math.max(1, points.length - 1);
    const animeBoost = 1 + 0.35 * (1 - Math.abs(t - 0.5) * 2);
    const scale = baseScale * animeBoost * (i % 2 === 0 ? 1.0 : 0.92);

    layers.push(await renderClusterAt(clusterBuf, p.x, p.y, angle - 90, scale, lift));
  }
  return layers;
}

async function compositeOne(selfiePath, landmarkPath, clusterBuf, outPath) {
  const lmRaw = JSON.parse(await readFile(landmarkPath, "utf8"));
  if (!lmRaw.ok) return { ok: false, reason: lmRaw.error ?? "no_face" };

  const { landmarks, width, height, metrics } = lmRaw;
  const span = interEyePx(landmarks, width, height);
  const leftSpan = Math.hypot(
    pt(landmarks, 33, width, height).x - pt(landmarks, 133, width, height).x,
    pt(landmarks, 33, width, height).y - pt(landmarks, 133, width, height).y,
  );
  const rightSpan = Math.hypot(
    pt(landmarks, 263, width, height).x - pt(landmarks, 362, width, height).x,
    pt(landmarks, 263, width, height).y - pt(landmarks, 362, width, height).y,
  );

  const layers = [
    ...(await buildEyeLayers(landmarks, LEFT_UPPER_LID, clusterBuf, width, height, leftSpan)),
    ...(await buildEyeLayers(landmarks, RIGHT_UPPER_LID, clusterBuf, width, height, rightSpan)),
  ];

  await sharp(selfiePath).composite(layers).jpeg({ quality: 93 }).toFile(outPath);

  return { ok: true, metrics, version: "v2_eyelid_arc" };
}

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const selfiesDir = join(ROOT, "fixtures", "selfies");
  const landmarksDir = join(ROOT, "out", "landmarks");
  const clusterPath = join(ROOT, "assets", "lash_cluster.png");
  const outDir = join(ROOT, "out", "composites-v2");
  const compareDir = join(ROOT, "out", "compare");
  await mkdir(outDir, { recursive: true });
  await mkdir(compareDir, { recursive: true });

  if (!(await fileExists(clusterPath))) {
    console.error("Ejecuta extract-lash-cluster.py primero");
    process.exit(1);
  }

  const clusterBuf = await readFile(clusterPath);
  const lmFiles = (await readdir(landmarksDir)).filter(
    (f) => f.endsWith(".json") && f !== "_summary.json",
  );

  const report = { version: "v2", results: [] };

  for (const lmFile of lmFiles.sort()) {
    const stem = lmFile.replace(".json", "");
    const selfiePath = join(selfiesDir, `${stem}.jpg`);
    const outPath = join(outDir, `${stem}_anime_v2.jpg`);

    try {
      const result = await compositeOne(
        selfiePath,
        join(landmarksDir, lmFile),
        clusterBuf,
        outPath,
      );
      report.results.push({ file: stem, ...result });
      console.log(`  [${result.ok ? "OK" : "SKIP"}] ${stem}`);

      // Side-by-side v1 vs v2 para muestras clave
      if (["02", "06", "08", "10"].includes(stem) && result.ok) {
        const v1 = join(ROOT, "out", "composites", `${stem}_anime.jpg`);
        if (await fileExists(v1)) {
          const v1Buf = await readFile(v1);
          const v2Buf = await readFile(outPath);
          const meta = await sharp(v1Buf).metadata();
          const h = meta.height ?? 800;
          const v1r = await sharp(v1Buf).resize({ height: h }).toBuffer();
          const v2r = await sharp(v2Buf).resize({ height: h }).toBuffer();
          const mw = (await sharp(v1r).metadata()).width ?? 400;
          await sharp({
            create: {
              width: mw * 2 + 8,
              height: h + 36,
              channels: 3,
              background: { r: 30, g: 30, b: 35 },
            },
          })
            .composite([
              { input: v1r, left: 0, top: 36 },
              { input: v2r, left: mw + 8, top: 36 },
            ])
            .jpeg({ quality: 90 })
            .toFile(join(compareDir, `${stem}_v1_vs_v2.jpg`));
        }
      }
    } catch (e) {
      report.results.push({ file: stem, ok: false, error: String(e) });
      console.log(`  [ERR] ${stem}: ${e.message}`);
    }
  }

  await writeFile(join(ROOT, "out", "spike-report-v2.json"), JSON.stringify(report, null, 2));
  console.log(`\nv2: ${outDir}`);
  console.log(`compare: ${compareDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
