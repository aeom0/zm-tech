#!/usr/bin/env bash
# Materializa credenciales desde Secrets del dashboard Cloud Agents (zm-tech).
# Default de proyecto: hub ZMTech (llaco…). Geema = misma BD que Lash (udelx…).
# En laptop: NUNCA pisa .env existentes si faltan Secrets.
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

# Hub (Landing / Odental / RepMAX / hub)
PROJECT_REF_ZMTECH="${SUPABASE_PROJECT_REF_ZMTECH:-llacowjutjfefboqgfnj}"
# GeemaStudio (+ tenant ZM Lash) — misma BD que monorepo Lash
PROJECT_REF_GEEMA="${SUPABASE_PROJECT_REF_GEEMA:-udelxwwnyivknslueerr}"
# Ref activo por defecto = hub
PROJECT_REF="${SUPABASE_PROJECT_REF:-$PROJECT_REF_ZMTECH}"

IN_CLOUD="${CURSOR_AGENT:-${CURSOR_CLOUD_AGENT:-}}"

# Token CLI: debe ser de la cuenta que administra el ref activo.
# Hub → cuenta zmtechdev. Geema/Lash → cuenta orta.1 (otro PAT).
TOKEN="${SUPABASE_ACCESS_TOKEN:-${SUPABASE_ACCESS_TOKEN_ZMTECH:-}}"
DB_URL="${DATABASE_URL:-${DATABASE_URL_ZMTECH:-}}"
SERVICE_ZMTECH="${SUPABASE_SERVICE_ROLE_KEY:-${SUPABASE_SERVICE_ROLE_KEY_ZMTECH:-}}"

missing=()
[[ -n "$DB_URL" ]] || missing+=("DATABASE_URL (o DATABASE_URL_ZMTECH)")
[[ -n "$TOKEN" ]] || missing+=("SUPABASE_ACCESS_TOKEN (cuenta zmtechdev para hub)")

if ((${#missing[@]} > 0)); then
  echo "cloud-bootstrap: faltan Secrets → ${missing[*]}" >&2
  echo "Dashboard: https://cursor.com/dashboard/cloud-agents → Secrets (env de este repo)" >&2
  if [[ -z "$DB_URL" && -z "$TOKEN" ]]; then
    echo "cloud-bootstrap: abort — sin DATABASE_URL ni token; no se tocan archivos" >&2
    exit 0
  fi
fi
write_root_env() {
  umask 077
  {
    echo "# Generado por .cursor/cloud-bootstrap-env.sh — no commitear"
    [[ -n "$DB_URL" ]] && printf 'DATABASE_URL=%s\n' "$DB_URL"
    [[ -n "$TOKEN" ]] && printf 'SUPABASE_ACCESS_TOKEN=%s\n' "$TOKEN"
    [[ -n "$SERVICE_ZMTECH" ]] && printf 'SUPABASE_SERVICE_ROLE_KEY=%s\n' "$SERVICE_ZMTECH"
    printf 'SUPABASE_PROJECT_REF=%s\n' "$PROJECT_REF"
    printf 'SUPABASE_PROJECT_REF_ZMTECH=%s\n' "$PROJECT_REF_ZMTECH"
    printf 'SUPABASE_PROJECT_REF_GEEMA=%s\n' "$PROJECT_REF_GEEMA"
    [[ -n "${DATABASE_URL_GEEMA:-}" ]] && printf 'DATABASE_URL_GEEMA=%s\n' "$DATABASE_URL_GEEMA"
    [[ -n "${SUPABASE_SERVICE_ROLE_KEY_GEEMA:-}" ]] && printf 'SUPABASE_SERVICE_ROLE_KEY_GEEMA=%s\n' "$SUPABASE_SERVICE_ROLE_KEY_GEEMA"
    [[ -n "${SUPABASE_ACCESS_TOKEN_GEEMA:-}" ]] && printf 'SUPABASE_ACCESS_TOKEN_GEEMA=%s\n' "$SUPABASE_ACCESS_TOKEN_GEEMA"
  } > .env
}

if [[ -n "$DB_URL" || -n "$TOKEN" ]]; then
  if [[ -n "${IN_CLOUD}" || ! -f .env ]]; then
    write_root_env
  else
    write_root_env
    # En cloud siempre; en local solo si no había .env (rama de arriba)
  fi
fi

# Apps hub / repmax apuntan al hub por defecto
materialize_app() {
  local dir="$1"
  shift
  mkdir -p "$dir"
  umask 077
  {
    echo "# Generado por cloud-bootstrap — no commitear"
    for pair in "$@"; do
      printf '%s\n' "$pair"
    done
  } > "$dir/.env.local"
}

if [[ -n "${IN_CLOUD}" ]]; then
  URL_ZMTECH="${NEXT_PUBLIC_SUPABASE_URL:-https://${PROJECT_REF_ZMTECH}.supabase.co}"
  ANON_ZMTECH="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}"
  if [[ -n "$ANON_ZMTECH" ]]; then
    materialize_app apps/hub \
      "NEXT_PUBLIC_SUPABASE_URL=${URL_ZMTECH}" \
      "NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_ZMTECH}"
    materialize_app apps/repmax-web \
      "NEXT_PUBLIC_SUPABASE_URL=${URL_ZMTECH}" \
      "NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_ZMTECH}" \
      ${SERVICE_ZMTECH:+SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ZMTECH}}
  fi
fi

if [[ -n "$TOKEN" ]]; then
  mkdir -p "${HOME}/.supabase"
  printf '%s' "$TOKEN" > "${HOME}/.supabase/access-token"
  chmod 600 "${HOME}/.supabase/access-token"
fi

echo "cloud-bootstrap: OK (default_ref=${PROJECT_REF}, DATABASE_URL=$([ -n "$DB_URL" ] && echo set || echo missing))"
