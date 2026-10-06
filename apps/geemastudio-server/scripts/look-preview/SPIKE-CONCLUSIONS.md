# Spike preview virtual — Conclusiones

## Fase 0 bis — Vertex Gemini Image (01-sep-2026) ✅ GO

**Veredicto: camino de producción para Plan 06.**

| Campo | Valor |
|-------|-------|
| Modelo | `gemini-2.5-flash-image` @ `us-central1` |
| API | Vertex AI `generateContent` (edición semántica — sin máscara MediaPipe) |
| Latencia piloto | ~26 s / imagen |
| Costo | ~USD 0.02–0.08 / imagen (créditos GCP ~USD 300) |
| Piloto real | Avril `51946235797` — selfie CTWA; 1.ª imagen automática validada por staff |

```bash
yarn gcp:setup-vertex    # una vez — JSON → .env
yarn gcp:bootstrap       # una vez — APIs + IAM (cuenta Owner)
yarn look-preview:vertex scripts/look-preview/fixtures/selfies/avril-selfie.jpg "Rimel diseño muñeca"
```

Runbook: [`docs/ops/VERTEX_AI_LOOK_PREVIEW.md`](../../docs/ops/VERTEX_AI_LOOK_PREVIEW.md)

---

## Fase 0 — Overlay MediaPipe + sharp (31-ago-2026) ❌ NO-GO

**Overlay automático con código solo → NO listo para cobrar S/5.**

### Iteraciones probadas

| Versión | Qué hizo | Resultado visual |
|---------|----------|------------------|
| **v1** | Tira de rayitas verticales en el centro del ojo | Palitos en párpado y **puente de la nariz** |
| **v2a** | Clusters en arco del párpado + textura del portafolio | Manchas oscuras / piel de otra modela |
| **v2b** | Clusters curvos sintéticos en arco | Casi invisible o irrelevante (02, 10) |

El **auto-pass 8/9** del spike v1 solo medía “hay cara y se generó JPG”, no calidad vendible.

### Por qué el overlay falló

1. Pestañas son detalle submilimétrico — un PNG mal puesto se nota al instante.
2. Cada rostro cambia curva, ángulo y tono de piel.
3. Extraer del portafolio sin diseñador arrastra piel y cejas.
4. Vertex Gemini resolvió calidad sin assets PNG ni máscara.

### Comandos overlay (archivo histórico)

```bash
yarn look-preview:spike-overlay      # v1
yarn look-preview:spike-overlay-v2   # v2 arco párpado
```

---

## Decisión de producto (cerrada 01-sep-2026)

1. **Motor:** Vertex Gemini Image vía Edge `look-preview` (no overlay, no fal.ai).
2. **Haiku:** solo validación de selfie + recomendación de estilo — no edita píxeles.
3. **Pay-first S/5** sin cambio — piloto Avril fue cortesía manual previa a automatizar.
4. **Siguiente:** secrets Supabase → deploy Edge → `/probar-mirada` + Culqi.
