#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROADMAP="${ROOT}/docs/geemastudio/ROADMAP.md"
PLAN13="${ROOT}/docs/geemastudio/docs/plans/13-PLAN-panel-parity-zm-lash.md"
PLAN04="${ROOT}/docs/geemastudio/docs/plans/04-geema-migration/04-ROADMAP-SPRINTS.md"

for file in "$ROADMAP" "$PLAN13" "$PLAN04"; do
  if [[ ! -f "$file" ]]; then
    echo "Error: falta documento esperado: ${file}" >&2
    exit 1
  fi
done

assert_contains() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "Error: estado documental esperado no encontrado en ${file}:" >&2
    echo "  ${text}" >&2
    exit 1
  fi
}

assert_absent() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "Error: estado documental obsoleto encontrado en ${file}:" >&2
    echo "  ${text}" >&2
    exit 1
  fi
}

# Hitos cerrados que deben permanecer reflejados en el estado ejecutivo.
assert_contains "$ROADMAP" "P14–P17/P2 push WABA"
assert_contains "$ROADMAP" "el estado de migración vive en Plan 04"
assert_contains "$ROADMAP" "P0 + P8 + P9 + P10 ✅"
assert_contains "$PLAN13" "PR-09 P0 + P8 + P9 + P10"
assert_contains "$PLAN04" "PR-09 P0 + P8 + P9 + P10 + P18–P20 validados"
assert_contains "$PLAN04" "[x] Historial + Portafolio en nav WABA"

# Frases que reabren trabajo ya cerrado o contradicen Track C.
assert_absent "$ROADMAP" "bloqueado por drift webhook"
assert_absent "$ROADMAP" "sin mirror limpio"
assert_absent "$ROADMAP" "siguiente = Historial WABA"
assert_absent "$ROADMAP" "Historial/Portafolio/Simulador ❌"
assert_absent "$ROADMAP" "reconciliar drift \`whatsapp-webhook\` prod v655"
assert_absent "$ROADMAP" "P8 smoke APK pendiente"
assert_absent "$PLAN13" "P8 smoke APK pendiente"

echo "✓ estado documental Geema consistente"
