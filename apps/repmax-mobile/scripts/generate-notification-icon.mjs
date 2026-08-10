#!/usr/bin/env node
/**
 * Genera notification-icon.png para expo-notifications (mismo criterio que zetaeme).
 * Fuente: brand/icon-rm.svg → blanco + alpha → 96×96.
 *
 * Uso (desde apps/repmax-mobile):
 *   node scripts/generate-notification-icon.mjs
 */
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");

const appDir = path.join(__dirname, "..");
const monorepoRoot = path.join(appDir, "../..");
const sourceSvg = path.join(
  monorepoRoot,
  "apps/repmax-web/public/brand/icon-rm.svg"
);
const outIcon = path.join(appDir, "assets/notification-icon.png");
const tmpPng = path.join(appDir, "assets/.notification-source.png");

function loadSharp() {
  try {
    return createRequire(path.join(appDir, "package.json"))("sharp");
  } catch {
    try {
      return createRequire(path.join(monorepoRoot, "package.json"))("sharp");
    } catch {
      return null;
    }
  }
}

async function withSharp(sharp) {
  execFileSync(
    "inkscape",
    [
      sourceSvg,
      "--export-type=png",
      `--export-filename=${tmpPng}`,
      "--export-width=512",
    ],
    { stdio: "inherit" }
  );

  const { data, info } = await sharp(tmpPng)
    .resize(512, 512, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const buf = Buffer.from(data);
  for (let i = 0; i < buf.length / 4; i++) {
    const o = i * 4;
    const a = buf[o + 3];
    if (a < 12) {
      buf[o] = 255;
      buf[o + 1] = 255;
      buf[o + 2] = 255;
      buf[o + 3] = 0;
      continue;
    }
    buf[o] = 255;
    buf[o + 1] = 255;
    buf[o + 2] = 255;
    buf[o + 3] = a >= 80 ? 255 : 0;
  }

  await sharp(buf, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ threshold: 1 })
    .resize(96, 96, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outIcon);

  fs.rmSync(tmpPng, { force: true });
  console.log(`OK ${path.relative(appDir, outIcon)} (96×96, blanco+alpha)`);
}

async function main() {
  if (!fs.existsSync(sourceSvg)) {
    console.error("No está icon-rm.svg en public/brand");
    process.exit(1);
  }
  const sharp = loadSharp();
  if (!sharp) {
    console.error(
      "Instala sharp (pnpm add -D sharp en repmax-mobile) o regenera con el pipeline Python/Inkscape."
    );
    process.exit(1);
  }
  await withSharp(sharp);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
