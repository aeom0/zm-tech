# Vertex AI — Preview virtual de looks (Plan 06/07)

Runbook operativo para **Google Cloud / Vertex AI Gemini Image** en el piloto ZM look-preview.

> **Producto y fases:** [`zm-tech/docs/geemastudio/docs/plans/06-PLAN-preview-virtual-extensiones-ctwa.md`](https://github.com/aeom0/zm-tech/blob/main/docs/geemastudio/docs/plans/06-PLAN-preview-virtual-extensiones-ctwa.md)  
> **Spike overlay (archivo):** [`scripts/look-preview/SPIKE-CONCLUSIONS.md`](../../scripts/look-preview/SPIKE-CONCLUSIONS.md)

**Última actualización:** 2026-09-28 (migración a `gemini-3.1-flash-image`)

---

## Decisión técnica (cerrada)

| Enfoque | Veredicto |
|---------|-----------|
| Overlay MediaPipe + `sharp` (Fase 0) | **NO-GO** — no vendible |
| **Vertex Gemini Image** (`gemini-2.5-flash-image`) | **GO** — piloto validado 01-sep-2026. **Migrado 28-sep-2026 → `gemini-3.1-flash-image`** (ver abajo) |
| Imagen 3 mask-inpaint / fal.ai | Descartado — Imagen 3 capability retirado; Vertex Gemini usa **edición semántica** (prompt + selfie ± **ref-bank**) |
| Multi-servicio 2 pasadas Vertex | **Pausado** (06-sep) — identidad OK, pero el 2.º paso contaminaba el 1.º |

### Migración a `gemini-3.1-flash-image` (28-sep-2026)

Motivada por el retiro de Gemini 2.5 (ver § Avisos de Google Cloud) y, sobre todo, porque la calidad de `gemini-2.5-flash-image` no convencía a Alberto en pruebas reales. Comparación lado a lado (mismo selfie, mismo prompt, misma ref de portafolio) para los estilos **rimel** y **anime**: `gemini-3.1-flash-image` da resultados notablemente mejores — Alberto los calificó de "excelente" y dio luz verde a migrar sin más pruebas.

Cambios de código (rama `claude/vertex-gemini-3-1-migration`):

- **Modelo**: `GEMINI_IMAGE_MODEL` default `gemini-2.5-flash-image` → **`gemini-3.1-flash-image`**.
- **Endpoint**: `gemini-3.1-flash-image` (y modelos Gemini 3.x en general) **solo sirven por el endpoint global** de Vertex (`aiplatform.googleapis.com`, sin prefijo de región, `locations/global`) — a diferencia de `gemini-2.5-flash-image`, que era regional (`us-central1-aiplatform.googleapis.com`). `GCP_LOCATION` default pasa de `us-central1` → **`global`**. `vertexGenerateContentUrl()` en `_shared/vertex-gemini-image.ts` ahora bifurca el host según `location === "global"`.
- **Prompt — anti-collage**: sin instrucción explícita, `gemini-3.1-flash-image` tiende a devolver un collage (selfie completo + zoom recortado del ojo apilados) en vez de una sola imagen. Se agregó la constante `SINGLE_IMAGE_LOCK` en `_shared/vertex-gemini-image.ts`, antepuesta a todo prompt de `buildLookPreviewPrompt()`, pidiendo explícitamente una sola imagen fotorrealista sin grid/collage/split. Verificado que corrige el problema en ambos estilos probados (rimel, anime).
- Archivos tocados: `supabase/functions/_shared/vertex-gemini-image.ts`, `supabase/functions/look-preview/index.ts` (defaults del health-check GET), `scripts/look-preview/vertex-preview.mjs` (URL builder + defaults del spike local), `.env` (`GCP_LOCATION=global`, `GEMINI_IMAGE_MODEL=gemini-3.1-flash-image`).
- `styles-seed-v1.json` (prompts ricos por estilo, solo usado por el spike local `vertex-preview.mjs`) **no** tiene `SINGLE_IMAGE_LOCK` incluido en sus `prompt_template` — pendiente evaluar si conviene inyectarlo centralmente desde el script o bakearlo en el seed si estos prompts llegan a producción.

**Guía de prompting actualizada (2.5 → 3.1) y hallazgos sobre `SINGLE_IMAGE_LOCK`:** [`zm-tech/docs/geemastudio/docs/plans/07-anexo-prompts-vertex-v1.md`](https://github.com/aeom0/zm-tech/blob/main/docs/geemastudio/docs/plans/07-anexo-prompts-vertex-v1.md) § Guía oficial de Google — Gemini 3.1 Flash Image / Nano Banana 2. Incluye la capacidad de hasta 14 imágenes de referencia (hoy usamos solo 2) como oportunidad pendiente de explorar para reforzar identidad facial.

### Banco de refs del generador (≠ portafolio WABA)

| | |
|--|--|
| Local | [`scripts/look-preview/ref-bank/`](../../scripts/look-preview/ref-bank/) |
| Storage | `waba-images/look-preview-refs/<style_key>/…` |
| Portafolio CTWA | `waba-images/portfolio/…` — campañas/panel; **no** fuente de verdad del try-on |

Anime GO parcial: ref `look-preview-refs/anime/anime-ref1.jpg` + prompt anatómico (mitad del párpado móvil). Detalle: [`07-anexo-prompts-vertex-v1.md`](https://github.com/aeom0/zm-tech/blob/main/docs/geemastudio/docs/plans/07-anexo-prompts-vertex-v1.md) § Bitácora 06-sep.

---

## Proyecto GCP

| Campo | Valor |
|-------|-------|
| **Project ID** | `project-7ab5aba0-0904-4cb9-a65` |
| **Service account** | `supabase-vertex-ai@project-7ab5aba0-0904-4cb9-a65.iam.gserviceaccount.com` |
| **Región** | `global` (requerido por `gemini-3.1-flash-image`; `gemini-2.5-flash-image` era `us-central1`) |
| **Modelo** | `gemini-3.1-flash-image` (env `GEMINI_IMAGE_MODEL`) |
| **Créditos** | ~USD 300 (~S/1000) trial GCP — suficiente para miles de imágenes piloto |

### APIs habilitadas

- `aiplatform.googleapis.com` (Vertex AI)
- `cloudresourcemanager.googleapis.com`
- `generativelanguage.googleapis.com`

### IAM — service account (prod Edge + spike local)

| Rol | Para qué |
|-----|----------|
| `roles/aiplatform.user` | Acceso base Vertex |
| `roles/ml.developer` | **`aiplatform.endpoints.predict`** en Gemini Image (sin esto → 403) |

Bootstrap idempotente (requiere **tu cuenta Owner** una vez):

```bash
yarn gcloud auth login
yarn gcp:bootstrap
```

Script: [`scripts/gcp-bootstrap.sh`](../../scripts/gcp-bootstrap.sh)

---

## Credenciales locales

**Nunca** commitear el JSON de Descargas ni `GCP_SERVICE_ACCOUNT_BASE64`.

```bash
# Desde JSON de GCP Console → .env + ~/.config/gcp/zm-vertex-sa.json
yarn gcp:setup-vertex
# o: node scripts/setup-gcp-vertex-env.mjs /ruta/service-account.json
```

Variables en `.env` (ver `.env.example`):

| Variable | Uso |
|----------|-----|
| `GOOGLE_APPLICATION_CREDENTIALS` | Ruta al JSON local (`~/.config/gcp/zm-vertex-sa.json`) |
| `GOOGLE_CLOUD_PROJECT_ID` | Project ID |
| `GCP_SERVICE_ACCOUNT_BASE64` | JSON completo en base64 — **mismo valor en Supabase Edge** |
| `GCP_LOCATION` | `global` |
| `GEMINI_IMAGE_MODEL` | `gemini-3.1-flash-image` |

Alternativa soportada en Edge (`_shared/gcp-auth.ts`): `GCP_SERVICE_ACCOUNT_JSON` o `GOOGLE_CLIENT_EMAIL` + `GOOGLE_PRIVATE_KEY`.

---

## Supabase Edge (prod)

**Secrets** (Dashboard → Edge Functions):

- `GCP_SERVICE_ACCOUNT_BASE64`
- `GCP_LOCATION` = `global` (opcional — el default en código ya es `global`)
- `GEMINI_IMAGE_MODEL` = `gemini-3.1-flash-image` (opcional — el default en código ya es `gemini-3.1-flash-image`)

**Función:** `supabase/functions/look-preview/` — `verify_jwt: true` (panel / web autenticado en scaffold actual).

Deploy: incluida en `.github/workflows/ota-production.yml` job `deploy-edge-functions`.

```bash
SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) \
  supabase functions deploy look-preview --project-ref udelxwwnyivknslueerr
```

### Endpoints (scaffold)

| Método | Acción | Descripción |
|--------|--------|-------------|
| `GET` | health | Verifica credenciales GCP (sin llamar al modelo) |
| `POST` | `{ "action": "ping" }` | OAuth token OK |
| `POST` | `{ "action": "preview", "imageBase64": "...", "style": "Anime" }` | Genera imagen (admin JWT) |

---

## Comandos de prueba local

```bash
# Spike Vertex (selfie + estilo)
yarn look-preview:vertex path/to/selfie.jpg "Rimel diseño muñeca"

# gcloud sin PATH recargado
yarn gcloud --version
```

Salida: `scripts/look-preview/out/vertex/` (gitignored).

### Piloto real (01-sep-2026)

- **Clienta:** Avril — `51946235797` — CTWA Mirada Espectacular
- **Selfie:** inbound WA → Storage `waba-images/inbound-chat/51946235797/…`
- **Prueba manual previa:** Gemini chat (staff) — imágenes enviadas por WA sin cobrar S/5
- **Spike Vertex:** primera imagen automática — calidad validada por Alberto (**GO**)

---

## gcloud + MCP Cursor

- **SDK:** `~/google-cloud-sdk/` — PATH en `~/.bashrc`
- **Wrapper:** `yarn gcloud` → `scripts/gcloud`
- **MCP:** servidor `gcp` en `.cursor/mcp.json` (`gcp-mcp-server` + `GOOGLE_APPLICATION_CREDENTIALS`)

Tras editar MCP: **Reload Window** en Cursor.

---

## Costo y créditos (~USD 300 trial)

### Precio listado (Gemini 2.5 Flash Image)

| Concepto | Valor |
|----------|-------|
| Output imagen (hasta ~1024²) | **USD 0.039** / imagen (~1290 tokens @ $30/1M) |
| Input (texto + selfie ± ref) | **USD 0.30** / 1M tokens |

Pack S/5 con 3 looks ≈ **USD 0.12** compute (+ input) → margen amplio vs S/5 (~USD 1.3).

### ¿Cuánto queda de los $300?

La CLI **no** expone el saldo de créditos trial. Ver en Consola (cuenta Owner):

1. [Credits](https://console.cloud.google.com/billing/0193CD-0B6DA0-699AF6/credits?project=project-7ab5aba0-0904-4cb9-a65) — saldo restante del crédito.
2. [Reports](https://console.cloud.google.com/billing/0193CD-0B6DA0-699AF6/reports?project=project-7ab5aba0-0904-4cb9-a65) — filtro proyecto `project-7ab5aba0-0904-4cb9-a65` + SKU Vertex / Gemini Image.

Billing account: `0193CD-0B6DA0-699AF6` (“Mi cuenta de facturación”, moneda **PEN**; el crédito trial suele mostrarse en USD).

### Cómo medimos de aquí en adelante

| Capa | Qué hace |
|------|----------|
| **Smoke local** | `yarn look-preview:vertex …` append a `scripts/look-preview/vertex-cost-log.jsonl` (gitignored) con `estimated_usd` por llamada + resumen acumulado al final. |
| **Fuente de verdad** | Consola Billing → Reports / Credits (gasto real + crédito restante). |
| **Prod (Plan 07)** | Persistir en `look_preview_results` (o log Edge): `style_key`, latency, `usageMetadata`, `estimated_usd` por orden. |
| **Alertas** | Activar [Cloud Billing Budget API](https://console.developers.google.com/apis/api/billingbudgets.googleapis.com/overview?project=project-7ab5aba0-0904-4cb9-a65) + presupuesto/alerta (ej. 50 % / 80 % del crédito). |

Estimación spike local (orden de magnitud, sep-2026): decenas de imágenes × ~$0.039 ≈ **pocos USD** del pack de $300. Confirmar en Credits/Reports.

### QA visual Anime / largo

Pausado 02-sep a refs Vanessa. Resumen: ref ZM = spikes OK / largas; Manga stock = megavolumen; prompt caps no alcanzan. Detalle: [`zm-tech/docs/geemastudio/docs/plans/07-anexo-prompts-vertex-v1.md`](https://github.com/aeom0/zm-tech/blob/main/docs/geemastudio/docs/plans/07-anexo-prompts-vertex-v1.md) § Bitácora.

---


## Avisos de Google Cloud (retiro de modelos / cambios de plataforma)

Este proyecto GCP (`project-7ab5aba0-0904-4cb9-a65`) recibe correos de Google Cloud sobre Gemini Enterprise Agent Platform — sí es un proyecto real y activo (no descartarlo como spam). Registrar aquí cualquier aviso con fecha límite:

- **28-sep-2026 — Retiro de Gemini 2.5 (Flash Lite / Flash / Pro):** correo de Google lista `project-7ab5aba0-0904-4cb9-a65` como afectado bajo "Gemini 2.5 Flash". **Confirmado (29-sep-2026):** `gemini-2.5-flash-image` sí caía dentro del retiro. **Vía Vertex AI/Agent Platform** (nuestro caso): retiro **15-mar-2027**. Vía Gemini API directa de AI Studio (no aplica a nosotros): **2-oct-2026**. **Resuelto (28-sep-2026):** migrado a `gemini-3.1-flash-image` — ver § Migración arriba. Nota de corrección: el reemplazo real es `gemini-3.1-flash-image` (Nano Banana 2), **no** `gemini-3.1-flash-lite-image` como se anotó inicialmente aquí — "Flash-Lite" es una variante solo-texto, sin capacidad de imagen; confirmado por prueba directa contra la API (404 en `-lite-image`, 200 en `gemini-3.1-flash-image`).
- **Durable Caching GA (15-oct-2026):** cache de contexto implícito pasa a almacenamiento durable (hasta 24h) por defecto en Gemini 3.x. No aplica de forma directa a nuestro uso actual (sin implicit caching relevante por volumen/patrón de uso) — sin acción requerida.

## Troubleshooting

| Síntoma | Causa | Fix |
|---------|-------|-----|
| `403 aiplatform.endpoints.predict` | SA sin `ml.developer` o IAM sin propagar | `yarn gcp:bootstrap` o esperar 1–2 min |
| `gcloud: command not found` | PATH | `source ~/.bashrc` o `yarn gcloud` |
| Gemini chat OK, Vertex API 403 | Chat ≠ Vertex API; credenciales distintas | Usar SA + roles arriba |
| Overlay spike feo | Esperado | No usar overlay en prod; ver SPIKE-CONCLUSIONS |

---

## Referencias código

| Archivo | Rol |
|---------|-----|
| `supabase/functions/_shared/gcp-auth.ts` | JWT service account → access token |
| `supabase/functions/_shared/vertex-gemini-image.ts` | `generateContent` + prompt look |
| `supabase/functions/look-preview/index.ts` | Edge scaffold |
| `scripts/look-preview/vertex-preview.mjs` | Spike local Node |
| `scripts/setup-gcp-vertex-env.mjs` | `.env` desde JSON |
