# Spike — Preview virtual de looks (Plan 06/07)

Scripts locales para validar el preview antes del MVP en prod.

## Camino actual — Vertex Gemini Image ✅

**Producción:** Vertex AI `gemini-2.5-flash-image` (edición semántica por prompt).

```bash
yarn gcp:setup-vertex    # una vez — JSON GCP → .env
yarn gcp:bootstrap       # una vez — APIs + IAM (cuenta Owner)
# Anime GO (16-sep): selfie original, sin ref close-up (esa se comía el rostro)
yarn look-preview:vertex scripts/look-preview/fixtures/selfies/avril-selfie.jpg anime --no-ref
yarn look-preview:vertex path/to/selfie.jpg anime
yarn look-preview:vertex …/avril-selfie.jpg anime \
  --ref=scripts/look-preview/ref-bank/anime/anime-ref1.jpg
```

| Ruta | Contenido |
|------|-----------|
| [`ref-bank/`](./ref-bank/) | Banco de refs del **generador** (no portafolio WABA) |
| `styles-seed-v1.json` | Prompts + URL de ref por `style_key` |
| `out/vertex/*.png` | Smokes generados (gitignored) |
| `fixtures/selfies/` | Selfies QA local (gitignored) |

Runbook: [`docs/ops/VERTEX_AI_LOOK_PREVIEW.md`](../../docs/ops/VERTEX_AI_LOOK_PREVIEW.md)  
Prompts + bitácora Anime: [`zm-tech/docs/geemastudio/docs/plans/07-anexo-prompts-vertex-v1.md`](https://github.com/aeom0/zm-tech/blob/main/docs/geemastudio/docs/plans/07-anexo-prompts-vertex-v1.md)  
Conclusiones overlay: [`SPIKE-CONCLUSIONS.md`](./SPIKE-CONCLUSIONS.md)

### Anime (16-sep-2026)

Smoke GO: selfie original + `--no-ref` (Vertex edita solo esa foto). La ref close-up `anime-ref1` **no** va en el generate: Gemini heredaba su 3:2 y cambiaba el rostro.  
Prompt: 7 espigas wearable **solo en pestaña superior**; inferiores idénticas a la selfie.  
Ref-bank se queda como spec visual, no como imagen (2) del try-on.  
Pipeline multi-servicio 2 pasadas **descartado por ahora**.

---

## Archivo histórico — Overlay MediaPipe ❌ NO-GO

Scripts overlay (Fase 0, 31-ago-2026) — **no usar en prod**, movidos a [`archive-overlay-mediapipe/`](./archive-overlay-mediapipe/):

```bash
yarn look-preview:spike-overlay      # v1
yarn look-preview:spike-overlay-v2   # v2 arco párpado
```

Requisitos overlay: Python 3.10+ venv, MediaPipe 0.10.18, `sharp`.

## .gitignore

`fixtures/`, `out/`, `portfolio-cache/`, `models/`, `.venv/` — no commitear selfies ni artefactos generados.  
**Sí versionar** `ref-bank/` (refs canónicas del generador).
