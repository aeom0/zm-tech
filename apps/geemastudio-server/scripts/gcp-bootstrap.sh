#!/usr/bin/env bash
# Bootstrap GCP para look-preview (Vertex AI). Ejecutar UNA VEZ con tu cuenta Google (Owner).
# La service account supabase-vertex-ai no puede darse permisos a sí misma.
set -euo pipefail

export PATH="/home/alber/google-cloud-sdk/google-cloud-sdk/bin:${PATH}"

PROJECT_ID="project-7ab5aba0-0904-4cb9-a65"
SA_EMAIL="supabase-vertex-ai@${PROJECT_ID}.iam.gserviceaccount.com"

echo "=== GCP bootstrap — ZM look-preview ==="
echo "Proyecto: ${PROJECT_ID}"
echo ""

ACTIVE="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null | head -1)"
if [[ "${ACTIVE}" == *"gserviceaccount.com" ]] || [[ -z "${ACTIVE}" ]]; then
  echo "Paso 1: Inicia sesión con TU cuenta Google (Owner del proyecto):"
  echo "  gcloud auth login"
  echo ""
  echo "Luego vuelve a correr este script."
  exit 1
fi

echo "Cuenta activa: ${ACTIVE}"
gcloud config set project "${PROJECT_ID}"

echo ""
echo "[1/3] Habilitando APIs..."
gcloud services enable \
  aiplatform.googleapis.com \
  cloudresourcemanager.googleapis.com \
  serviceusage.googleapis.com \
  --project="${PROJECT_ID}"

echo ""
echo "[2/3] Roles Vertex para service account..."
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/aiplatform.user" \
  --condition=None
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/ml.developer" \
  --condition=None
gcloud services enable generativelanguage.googleapis.com --project="${PROJECT_ID}" || true

echo ""
echo "[3/3] Verificando service account (activate para pruebas)..."
gcloud auth activate-service-account --key-file="${HOME}/.config/gcp/zm-vertex-sa.json" --quiet
gcloud config set project "${PROJECT_ID}"

echo ""
echo "✓ Bootstrap listo."
echo "  Probar: yarn look-preview:vertex scripts/look-preview/fixtures/selfies/avril-selfie.jpg Anime"
echo ""
echo "Opcional — volver a tu cuenta personal en gcloud:"
echo "  gcloud auth login"
