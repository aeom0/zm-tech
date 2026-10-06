#!/usr/bin/env bash
# Spike v2 — clusters en arco de párpado + asset del portafolio
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT/../../.."

VENV="$ROOT/.venv"
if [[ ! -d "$VENV" ]]; then
  python3 -m venv "$VENV"
fi
# shellcheck disable=SC1091
source "$VENV/bin/activate"
pip install -q -r scripts/look-preview/archive-overlay-mediapipe/requirements.txt

if [[ ! -f scripts/look-preview/fixtures/selfies/01.jpg ]]; then
  node scripts/look-preview/archive-overlay-mediapipe/download-fixtures.mjs
fi

echo "[1/3] Landmarks…"
python scripts/look-preview/archive-overlay-mediapipe/detect_landmarks.py \
  --in scripts/look-preview/fixtures/selfies \
  --out scripts/look-preview/out/landmarks

echo "[2/3] Asset pestañas (sintético curvo)…"
python scripts/look-preview/archive-overlay-mediapipe/generate-cluster.py

echo "[3/3] Compositor v2…"
node scripts/look-preview/archive-overlay-mediapipe/composite-v2.mjs

echo ""
echo "Compara v1 vs v2: scripts/look-preview/out/compare/"
echo "Resultados v2:    scripts/look-preview/out/composites-v2/"
