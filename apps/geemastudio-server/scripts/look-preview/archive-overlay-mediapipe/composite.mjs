#!/usr/bin/env node
/**
 * Compone overlays sintéticos Anime sobre selfies (landmarks + sharp).
 */
import { readdir, readFile, writeFile, mkdir, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const LEFT_INNER = 133;
const LEFT_OUTER = 33;
const LEFT_TOP = 159;
const RIGHT_INNER = 362;
const RIGHT_OUTER = 263;
const RIGHT_TOP = 386;

function eyeTransform(landmarks, inner, outer, top, imgW, imgH) {
  const p = (i) => ({
    x: landmarks[i].x * imgW,
    y: landmarks[i].y * imgH,
  });
  const a = p(inner);
  const b = p(outer);
  const t = p(top);
  const cx = (a.x + b.x) / 2;
  const cy = (t.y + (a.y + b.y) / 2) / 2;
  const width = Math.hypot(b.x - a.x, b.y - a.y) * 2.4;
  const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  return { cx, cy, width, angle };
}

async function renderEyeOverlay(overlayBuf, t, opacity = 0.92) {
  const meta = await sharp(overlayBuf).metadata();
  const ow = meta.width ?? 240;
  const oh = meta.height ?? 100;
  const targetW = Math.max(28, Math.round(t.width));
  const targetH = Math.max(14, Math.round((oh / ow) * targetW));

  const rotated = await sharp(overlayBuf)
    .resize(targetW, targetH, { fit: "fill" })
    .ensureAlpha()
    .rotate(t.angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .modulate({ brightness: 1.05 })
    .toBuffer();

  const rMeta = await sharp(rotated).metadata();
  const rw = rMeta.width ?? targetW;
  const rh = rMeta.height ?? targetH;

  const layer = await sharp(rotated)
    .ensureAlpha()
    .composite([
      {
        input: Buffer.from([255, 255, 255, Math.round(opacity * 255)]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: "dest-in",
      },
    ])
    .toBuffer();

  return {
    input: layer,
    left: Math.round(t.cx - rw / 2),
    top: Math.round(t.cy - rh * 0.52),
    blend: "over",
  };
}

async function compositeOne(selfiePath, landmarkPath, overlayLeft, overlayRight, outPath) {
  const lmRaw = JSON.parse(await readFile(landmarkPath, "utf8"));
  if (!lmRaw.ok) {
    return { ok: false, reason: lmRaw.error ?? "no_face" };
  }

  const { landmarks, width, height, metrics } = lmRaw;
  const base = await sharp(selfiePath).ensureAlpha().toBuffer();

  const leftT = eyeTransform(landmarks, LEFT_INNER, LEFT_OUTER, LEFT_TOP, width, height);
  const rightT = eyeTransform(landmarks, RIGHT_INNER, RIGHT_OUTER, RIGHT_TOP, width, height);

  const layers = [
    await renderEyeOverlay(overlayLeft, leftT),
    await renderEyeOverlay(overlayRight, rightT),
  ];

  await sharp(base).composite(layers).jpeg({ quality: 92 }).toFile(outPath);

  return {
    ok: true,
    metrics,
    auto_score_hint: scoreHint(metrics),
  };
}

function scoreHint(metrics) {
  if (!metrics?.eyes_visible) return 1;
  if (metrics.likely_profile) return 2;
  if (metrics.left_eye_open_px < 12 || metrics.right_eye_open_px < 12) return 2;
  if (metrics.inter_eye_px < 40) return 3;
  return 4;
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
  const assetsDir = join(ROOT, "assets");
  const outDir = join(ROOT, "out", "composites");
  await mkdir(outDir, { recursive: true });

  const stripPath = join(assetsDir, "anime_lash_strip.png");
  if (!(await fileExists(stripPath))) {
    console.error("Falta assets/anime_lash_strip.png — ejecuta generate-overlay.py");
    process.exit(1);
  }

  const overlayLeft = await readFile(stripPath);
  const overlayRight = await readFile(join(assetsDir, "anime_lash_strip_flipped.png"));

  const lmFiles = (await readdir(landmarksDir)).filter(
    (f) => f.endsWith(".json") && f !== "_summary.json",
  );

  const report = {
    generated_at: new Date().toISOString(),
    style: "anime",
    overlay_mode: "synthetic_strip",
    results: [],
    auto_pass_count: 0,
    go_no_go_threshold: "≥7/10 con score_hint ≥4 + revisión humana",
  };

  for (const lmFile of lmFiles.sort()) {
    const stem = lmFile.replace(".json", "");
    const selfiePath = join(selfiesDir, `${stem}.jpg`);
    const landmarkPath = join(landmarksDir, lmFile);
    const outPath = join(outDir, `${stem}_anime.jpg`);

    try {
      const result = await compositeOne(
        selfiePath,
        landmarkPath,
        overlayLeft,
        overlayRight,
        outPath,
      );
      report.results.push({ file: stem, output: `${stem}_anime.jpg`, ...result });
      if (result.ok && result.auto_score_hint >= 4) report.auto_pass_count += 1;
      console.log(
        `  [${result.ok ? "OK" : "SKIP"}] ${stem} hint=${result.auto_score_hint ?? "-"}`,
      );
    } catch (e) {
      report.results.push({ file: stem, ok: false, error: String(e) });
      console.log(`  [ERR] ${stem}: ${e.message}`);
    }
  }

  const total = report.results.filter((r) => r.ok).length;
  const totalInput = lmFiles.length;
  report.total_ok = total;
  report.total_input = totalInput;
  report.auto_pass_rate = total ? report.auto_pass_count / total : 0;
  report.phase0_recommendation =
    report.auto_pass_count >= 7
      ? "GO — proceder Fase 1 MVP (validar visualmente out/composites/)"
      : report.auto_pass_count >= 5
        ? "ITERAR — ajustar assets/posición; spike prometedor pero no cumple umbral 7/10"
        : "NO-GO — overlay/landmarks insuficientes para producto de pago";

  const reportPath = join(ROOT, "out", "spike-report.json");
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nComposites: ${outDir}`);
  console.log(`Reporte: ${reportPath}`);
  console.log(
    `Auto-pass hint ≥4: ${report.auto_pass_count}/${total} (${totalInput} inputs) — ${report.phase0_recommendation}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
