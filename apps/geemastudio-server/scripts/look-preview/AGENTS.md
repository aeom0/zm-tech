# AGENTS.md — scripts/look-preview

Spike de preview virtual de looks (pestañas/cejas/uñas) — Plan 06/07. Detalle completo en [README.md](./README.md) y [docs/ops/VERTEX_AI_LOOK_PREVIEW.md](../../docs/ops/VERTEX_AI_LOOK_PREVIEW.md).

## Camino vigente

- Producción: Vertex AI `gemini-3.1-flash-image` vía endpoint **global** (edición semántica por prompt; migrado desde `gemini-2.5-flash-image` el 28-sep-2026, ver `docs/ops/VERTEX_AI_LOOK_PREVIEW.md` § Migración) — **no** el overlay MediaPipe (descartado, ver `archive-overlay-mediapipe/` y `SPIKE-CONCLUSIONS.md`).
- Setup una vez: `yarn gcp:setup-vertex` + `yarn gcp:bootstrap`.
- Smoke local: `yarn look-preview:vertex path/to/selfie.jpg <style>` (Anime GO: `--no-ref`; A/B `--ref=scripts/look-preview/ref-bank/<style>/<archivo>.jpg`).
- Prompts + bitácora por estilo: `zm-tech/docs/geemastudio/docs/plans/07-anexo-prompts-vertex-v1.md`.

## Reglas

- `ref-bank/` es el banco de refs del **generador** — no confundir con el portafolio WABA (ver AGENTS.md raíz § Portafolio, `docs/waba/`).
- `out/` y `fixtures/selfies/` están gitignored — no commitear salidas generadas ni selfies de QA.
