#!/usr/bin/env bash
# Fase 0 — spike preview virtual extensiones (Plan 06)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT/../../.."

echo "=== Lash overlay spike (archivo NO-GO) — Fase 0 ==="

echo "[1/5] Fixtures…"
node scripts/look-preview/archive-overlay-mediapipe/download-fixtures.mjs

echo "[2/5] Python venv + deps…"
VENV="$ROOT/.venv"
if [[ ! -d "$VENV" ]]; then
  python3 -m venv "$VENV"
fi
# shellcheck disable=SC1091
source "$VENV/bin/activate"
pip install -q -r scripts/look-preview/archive-overlay-mediapipe/requirements.txt

echo "[3/5] Landmarks (MediaPipe Face Mesh CPU)…"
python scripts/look-preview/archive-overlay-mediapipe/detect_landmarks.py \
  --in scripts/look-preview/fixtures/selfies \
  --out scripts/look-preview/out/landmarks

echo "[4/5] Generar overlay sintético Anime + extraer referencia portafolio…"
python scripts/look-preview/archive-overlay-mediapipe/generate-overlay.py
python scripts/look-preview/archive-overlay-mediapipe/extract-overlay.py || true

echo "[5/5] Compositor (sharp)…"
node scripts/look-preview/archive-overlay-mediapipe/composite.mjs

echo ""
echo "Listo. Revisa:"
echo "  scripts/look-preview/out/composites/"
echo "  scripts/look-preview/out/spike-report.json"
