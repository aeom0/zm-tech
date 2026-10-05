# Anexo Plan 07 — Prompts Vertex v1

> **v1.8 (28-sep-2026):** Documentados los 23 prompts originales de la sesión de Gemini (fuente de `styles-seed-v1.json`) en [`07-anexo-prompts-gemini-original-v1.md`](./07-anexo-prompts-gemini-original-v1.md) — export en PDF de un chat, filtrado a solo las respuestas con prompts. Cubre las 6 categorías (no solo extensiones).  
> **v1.7 (28-sep-2026):** Migrado a `gemini-3.1-flash-image` (Nano Banana 2, endpoint global) — guía oficial de Google actualizada de 2.5 a 3.1 (ver abajo). Documentado hallazgo `SINGLE_IMAGE_LOCK` (fix de collage) + hipótesis de reemplazarlo/reforzarlo con las reglas de la nueva guía (framing positivo, hasta 14 refs). Detalle de la migración: `docs/ops/VERTEX_AI_LOOK_PREVIEW.md` § Migración a gemini-3.1-flash-image.  
> **v1.6 (06-sep-2026):** Anime **GO parcial** — prompt anatómico (mitad del párpado móvil / bajo el pliegue) + ref-bank `anime-ref1.jpg`. Banco de refs del generador separado del portafolio WABA. Multi-servicio 2 pasadas **descartado por ahora**.  
> **v1.5 (02-sep-2026):** bitácora QA **Anime / largo** (pausado a refs Vanessa). Prompt `anime` en seed: patrón Manga + cap largo; **no** copiar largo de la ref glam.  
> **v1.4:** mapas cortos + LENGTH RULE vs pestañas inferiores (control débil vs prior glam del modelo).  
> **v1.3:** mapas cortos (pico ≤9 mm) + instrucción FINAL lid→brow.

Plan: [`07-PLAN-look-preview-multi-servicio.md`](./07-PLAN-look-preview-multi-servicio.md).  
Smoke: `yarn look-preview:vertex <selfie> <style_key> [--ref=…] [--no-ref] [--suffix=tag]` · salidas `scripts/look-preview/out/vertex/` (gitignored).  
**Banco de refs del generador:** [`scripts/look-preview/ref-bank/`](https://github.com/aeom0/ZM-Lash-and-Nails-Beauty/blob/main/scripts/look-preview/ref-bank) → Storage `waba-images/look-preview-refs/` (**no** `portfolio/`).

**Nota sobre las bitácoras QA de este doc (secciones abajo):** todas corrieron contra `gemini-2.5-flash-image` (ago–sep 2026) y se conservan como histórico — el modelo en producción desde 28-sep-2026 es `gemini-3.1-flash-image`. Sus hallazgos sobre mapping mm / control de largo / identidad facial siguen siendo relevantes como punto de partida, pero **no** están re-validados contra 3.1 todavía.

## Guía oficial de Google — Gemini 3.1 Flash Image / Nano Banana 2 (prompting)

Fuente: [cloud.google.com/blog — Ultimate prompting guide for Nano Banana](https://cloud.google.com/blog/products/ai-machine-learning/ultimate-prompting-guide-for-nano-banana) (05-mar-2026, Khulan Davaajav / Hussain Chinoy, Google Cloud). Reemplaza la guía de Gemini 2.5 Flash Image (28-ago-2025) que estaba antes en esta sección, retirada el 28-sep-2026 tras la migración de modelo. Cubre **Nano Banana 2** (`gemini-3.1-flash-image`, el que usamos) y **Nano Banana Pro** (`gemini-3-pro-image`, variante premium no usada aquí).

### Principios centrales

1. **Ser específico** — detalles concretos de sujeto, iluminación y composición.
2. **Framing positivo** — describir lo que se quiere, no lo que no se quiere ("empty street" en vez de "no cars"). **Ojo:** nuestros 23 prompts de `styles-seed-v1.json` y el prompt de producción (`buildLookPreviewPrompt`) usan mucho framing negativo ("Do not create...", "Do not apply...") — candidato a revisar (ver § Próximos pasos).
3. **Controlar la cámara** — términos fotográficos/cinematográficos ("low angle", "aerial view", "macro lens").
4. **Iterar conversacionalmente** — refinar con prompts de seguimiento en flujo natural, no reconstruir desde cero.
5. **Empezar con un verbo de acción fuerte** que indique la operación principal.

### 5 frameworks de prompting

1. **Generación texto→imagen** — fórmula `[Sujeto] + [Acción] + [Ubicación/Contexto] + [Composición] + [Estilo]`.
2. **Generación multimodal con referencias** — fórmula `[Imágenes de referencia] + [Instrucción de relación entre ellas] + [Nuevo escenario]`. Relevante para nosotros: selfie + ref de portafolio son exactamente este patrón.
3. **Edición de imágenes**:
   - **A. Edición conversacional sin nuevas refs** (semantic masking / inpainting) — ser explícito sobre qué mantener igual. Es lo que usamos hoy (selfie + prompt).
   - **B. Composición y transferencia de estilo con nuevas refs** — combinar imagen base + imagen de objeto/estilo.
4. **Info en tiempo real vía web search** — "coming soon" en Vertex AI (no disponible aún); no aplica todavía.
5. **Prompting como director creativo** — diseñar iluminación explícitamente (ej. "three-point softbox setup", "chiaroscuro lighting"), elegir cámara/lente ("f/1.8 shallow depth of field", "macro lens"), definir color grading/film stock, y enfatizar materialidad/textura con detalle concreto en vez de términos genéricos (ej. "navy blue tweed" en vez de "suit jacket").

### Capacidad clave para nosotros: hasta 14 imágenes de referencia

La guía confirma que Nano Banana 2 acepta **hasta 14 imágenes de referencia por prompt** (hoy usamos 2: selfie + 1 foto de portafolio). Documentación del modelo (`ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image`) menciona además soporte de **hasta 5 imágenes para "character consistency"** — preservar identidad facial entre generaciones, que es justo nuestro punto más frágil (ver bitácoras QA de identidad abajo). Oportunidad a explorar: sumar más referencias del mismo estilo/ángulo, o repetir la selfie en distintos crops, para reforzar identidad y patrón de estilo simultáneamente — no implementado todavía, pendiente de prueba.

### Especificaciones técnicas relevantes

| Campo | Nano Banana 2 (`gemini-3.1-flash-image`) |
|-------|-------------------------------------------|
| Refs de entrada | hasta 14 imágenes por prompt |
| Resoluciones | 512px, 1K, 2K, 4K |
| Aspect ratios | 1:1, 3:2, 2:3, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9, 1:4, 4:1, 1:8, 8:1 |
| Contexto máx. input | 131,072 tokens |
| Formatos de imagen soportados | png, jpeg, webp, heic, heif |

### Hallazgo propio (no documentado por Google): fix de collage/grid — `SINGLE_IMAGE_LOCK`

Al migrar a `gemini-3.1-flash-image`, las primeras pruebas devolvían un **collage de 2 paneles** (selfie completa + zoom recortado del ojo apilados) en vez de una sola imagen editada — la guía oficial **no menciona este comportamiento ni cómo evitarlo**. Se resolvió anteponiendo una instrucción fija (`SINGLE_IMAGE_LOCK` en `supabase/functions/_shared/vertex-gemini-image.ts`) pidiendo explícitamente UNA sola imagen fotorrealista sin grid/collage/split/duplicado — verificado que corrige el problema en los estilos probados (rimel, anime).

**Hipótesis pendiente de validar:** siguiendo los lineamientos de esta guía (framing positivo, prompt estructurado por framework en vez de listas de negaciones) el modelo podría dejar de generar collages sin necesitar el lock explícito, o el lock podría simplificarse a una sola frase positiva ("Return ONE full-frame photorealistic edit matching the original selfie's composition") en vez de la lista actual de negaciones. **No probado todavía** — evaluar cuando se ajusten los prompts por estilo (ver § Próximos pasos), idealmente A/B con y sin el lock una vez aplicado el framing positivo, antes de decidir si se puede retirar.

### Próximos pasos (28-sep-2026)

1. ✅ Prompts originales de la sesión de Gemini documentados en [`07-anexo-prompts-gemini-original-v1.md`](./07-anexo-prompts-gemini-original-v1.md) (los 23 estilos, fuente de `styles-seed-v1.json`) — revisar contra esta guía antes de decidir ajustes finales por estilo.
2. Evaluar reescribir `buildLookPreviewPrompt()` y los 23 `prompt_template` de `styles-seed-v1.json` con framing positivo (quitar/reducir "Do not..." donde se pueda describir el resultado deseado en positivo) — **no hacer de golpe sin probar**, dado el historial de fragilidad de identidad/largo documentado en las bitácoras QA de abajo.
3. Probar la hipótesis del `SINGLE_IMAGE_LOCK` simplificado (ver arriba) en A/B contra el lock actual.
4. Explorar el límite de 14 refs / character-consistency de 5 imágenes como mecanismo para reforzar identidad facial, hoy el punto más débil según las bitácoras de Anime.

## Bitácora QA — Anime (06-sep-2026) — GO parcial

**Estado:** desbloqueado vs v1.5. Prompt + ref canónicos en seed / ref-bank. QA visual humana (Alberto); sin auditoría multimodal automática.

**Selfie de prueba:** Avril — `scripts/look-preview/fixtures/selfies/avril-selfie.jpg`.  
**Modelo:** `gemini-2.5-flash-image` @ `us-central1` · ~USD 0.039/imagen (+ input).

### Hallazgo que desbloqueó Anime

| Pieza | Valor |
|-------|--------|
| Prompt | **7 espigas** Manga exactas, patrón de imagen (2); **solo superiores**; inferiores 100% naturales; **sin** ancla de ceja/pliegue (esas anclas empeoraban o no ayudaban). Smoke QA: `7spikes-no-length-anchor` / `-r2` |
| Ref | `ref-bank/anime/anime-ref1.jpg` (Storage `look-preview-refs/anime/anime-ref1.jpg`) |
| Veredicto | Identidad Avril estable + espigas Anime legibles (~7). GO parcial — cerrado sesión 06-sep |

### Descartado por ahora

| Enfoque | Por qué |
|---------|---------|
| Pipeline 2 pasadas (Anime → Microshading en 2 llamadas) | Identidad OK, pero el 2.º paso **contaminaba/normalizaba** las espigas Anime al ver pestañas normales en la ref de cejas |
| Combo monolítico 1 llamada (Anime + Microshading) | Deriva de identidad facial (ojos/cejas genéricas) |
| Pipeline crop→edit→blend (2-pass overlay) | Resultado ficticio / no inpainting semántico |

### Banco de refs (generador ≠ portafolio)

- Canónico local: `scripts/look-preview/ref-bank/` + `manifest.json`
- Storage: `waba-images/look-preview-refs/<style_key>/…`
- Portafolio WABA (`waba-images/portfolio/`) sigue para campañas/panel; **no** es la fuente de verdad del try-on

### Próximo

1. Re-seed `look_preview_styles` en prod con prompt + URL Anime v1.6 (cuando se apruebe merge).
2. Ir llenando ref-bank por `style_key` (Fox, Wispy, etc.) con el mismo criterio wearable.
3. Multi-servicio: reabrir solo con estrategia que no destruya el servicio previo (orden, máscara o refs sin ojos conflictivos).

---

## Bitácora QA — Anime / control de largo (02-sep-2026) — histórico

**Estado (histórico):** pausado hasta refs wearable — **superado parcialmente** por § Bitácora 06-sep arriba.

**Selfie de prueba:** Avril — `scripts/look-preview/fixtures/selfies/avril-selfie.jpg`.  
**Modelo:** `gemini-2.5-flash-image` @ `us-central1` · ~USD 0.039/imagen (+ input).

### Diagnóstico de Alberto (cerrado)

| Output | Veredicto |
|--------|-----------|
| Ref Manga limpia (Hey Me, sin mapa) | Parece **Megavolumen** / abanico denso — pierde spikes |
| Ref portafolio ZM Anime | **Mejor agrupamiento** Manga, pero **demasiado largas** |

### Intentos y resultados

| # | Qué probamos | Output (local) | Resultado |
|---|--------------|----------------|-----------|
| 1 | Prompt con mapas mm cortos + “lower third lid→brow” + LENGTH RULE vs pestañas inferiores (v1.3–v1.4, todos los estilos) | varios `avril-selfie_*.png` | **Débil:** el modelo prioriza glam largo; mm en texto casi no anclan |
| 2 | Mapa Manga Hey Me **con leyenda** ([webp](https://heymebeauty.com/wp-content/uploads/2024/12/manga-lash-extensions-map.webp)) — útil como **spec** (base 7–8, spikes 10→14 mm) | cache `portfolio-cache/manga-lash-extensions-map.webp` | **OK como documento**; **malo** como única imagen Vertex (números/overlay confunden) |
| 3 | Foto Manga **sin mapeo** (`mapping-anime2.jpg`, ojo espejado OK) como `--ref=` | `avril-selfie_anime_manga-ref.png` | **NO-GO:** megavolumen / fan denso; no respeta ritmo spike–base |
| 4 | Ref portafolio ZM Anime (URL seed `98772a98-…/1.jpg`) | `avril-selfie_anime_prev-zm-ref.png` (y `avril-selfie_anime.png`) | **Parcial GO patrón:** spikes agrupados; **NO-GO largo** |
| 5 | Prompt v1.5: “copia COUNT/SPACING de la ref, **IGNORE length**”; cap 1.2–1.5× inferior; anti Mega; spikes ≤12 mm + ref ZM | `avril-selfie_anime_short-spikes.png` | **NO-GO largo:** sigue dramático; la ref glam gana al texto |
| 6 | Mismo prompt v1.5 **`--no-ref`** (solo texto) | `avril-selfie_anime_noref-short.png` | **NO-GO largo:** prior “Anime = picos largos” del modelo; spikes sí, largo no |

### Qué funciona

- **Vertex + selfie Avril** → identidad facial estable (ojos/piel/fondo).
- **2.ª imagen de portafolio ZM** → ancla **estilo/agrupamiento** (spikes Anime) mejor que prompt solo o que foto Manga “limpia” de stock.
- **Mapa mm Hey Me** → especificación de producto para Vanessa/prompt (base corta + spikes ≤~12–14 mm), no como input visual del modelo.
- **Smoke flags** `--ref=` / `--no-ref` / `--suffix=` + cost log `scripts/look-preview/vertex-cost-log.jsonl` → A/B barato y medible.
- **Fox / otros** (piloto previo): más aceptables; el dolor fuerte de largo es **Anime** (y glam genérico del modelo).

### Qué no funciona

- **Texto solo** (LENGTH RULE, mm, “lower third”, “shorten vs reference”) **no controla** el largo cuando el prior del modelo o la ref son glam.
- Instrucción “**Match the eyelash LENGTH** of image (2)” + ref ZM larga → **contradice** cualquier cap de largo (evitar en prompts).
- **Ref Manga stock** (aunque sea el look correcto en foto) → Vertex la interpreta como **volumen denso**, no como spikes separados.
- Iterar más prompts **sin** ancla visual de **largo wearable** = gasto sin señal nueva.

### Siguiente (bloqueado en Vanessa)

1. Refs **wearable** salón ZM: mismo agrupamiento Anime/Manga, **largo real** que Vanessa apruebe (ideal: foto terminada sin watermark extremo, o flyer corto).
2. Cablear esa URL en `look_preview_styles.portfolio_image_url` / seed `anime`.
3. Prompt: copiar **patrón** de la ref corta; mm del mapa Hey Me como techo; **prohibido** match de largo a refs glam viejas.
4. Re-smoke A/B: `prev-zm-ref` vs nueva ref Vanessa → `…_anime_vanessa-ref.png`.

### Archivos de referencia locales (gitignored / cache)

| Ruta | Uso |
|------|-----|
| `scripts/look-preview/portfolio-cache/mapping-anime2.jpg` | Manga sin mapa (Downloads) |
| `…/mapping-anime2-flop.jpg` | Espejo H (alineación al mapa) |
| `…/manga-lash-extensions-map.webp` | Spec mm Hey Me |
| `scripts/look-preview/out/vertex/ref_anime.jpg` | Ref ZM descargada en smokes previos |
| `…/avril-selfie_anime_*.png` | Matriz A/B de esta bitácora |

---

## Cobertura

| # | style_key | mapping_mm |
|---|-----------|------------|
| 1 | `clasicas` | 6-7-7-8-8-7-7-6 mm |
| 2 | `rimel` | 6-7-7-8-8-7-7 mm |
| 3 | `mojado_wet` | 6-7-8-8-8-7-6 mm |
| 4 | `vol_tec_3d_natural` | 6-7-7-8-7-7-6 mm |
| 5 | `vol_tec_3d_ardilla` | 6-7-7-8-8-7-6 mm |
| 6 | `vol_tec_3d_cat_eyes` | 6-7-7-8-8-9-9 mm |
| 7 | `vol_tec_3d_ojo_abierto` | 6-7-8-8-8-7-6 mm |
| 8 | `vol_tec_4d_natural` | 6-7-7-8-7-7-6 mm |
| 9 | `vol_tec_4d_ardilla` | 6-7-7-8-8-7-6 mm |
| 10 | `vol_tec_4d_cat_eyes` | 6-7-7-8-8-9-9 mm |
| 11 | `hawaiana` | 6-7-7-8-8-7-7-6 mm |
| 12 | `fox` | 6-7-7-8-8-9-9 mm |
| 13 | `mega_volumen` | 6-7-7-8-7-7-6 mm |
| 14 | `wispy_glam` | 6-7-8-8-8-7-6 mm |
| 15 | `anime` | base 7–8 · spikes ≤12 mm (Manga) |
| 16 | `micro_doll_eye` | 6-7-8-8-8-7-6 mm |
| 17 | `lifting_pestanas` | — |
| 18 | `cejas_diseno` | — |
| 19 | `cejas_laminado` | — |
| 20 | `microblading_solo` | — |
| 21 | `hidralips` | — |
| 22 | `unas_gel_natural` | — |
| 23 | `unas_diseno_simple` | — |

## Prompts

### `clasicas`

- **display:** Extensiones Clásicas
- **category:** `extensiones`

```text
Perform a photorealistic edit applying 1:1 Classic Eyelash Extensions to the user's upper lash line. Root every synthetic lash fiber individually into the natural upper eyelid lash line following the organic lid contour. Apply exactly 1 single synthetic fiber attached per 1 natural lash with clear isolation between every strand and zero clumping. Apply a smooth C-curl following a length mapping sequence from 6mm at the inner corner, 7mm, 7mm, 8mm, peaking at 8mm mid-eye, tapering down to 8mm, 7mm, and 7mm at the outer corner. Preserve 100% of original facial identity, face shape, iris color, skin pores, fine lines, surrounding brow structure, lighting, and background. Edit exclusively the upper eyelash fibers. Do not create volume fans, clustered clumps, heavy mascara coating, floating fibers, plastic sticker look, blurred eyelid edges, skin smoothing, or altered eye color. Apply individual 1:1 classic eyelash extensions, perfectly isolated single fibers seamlessly attached along the upper lash line following the 7 to 6mm natural arc mapping with realistic fiber sheen. CRITICAL FINAL INSTRUCTION: Keep lashes SHORT and salon-wearable. Tips must stay in the lower third of the space between the upper lash line and the eyebrow. Never approach or touch the brow. Prefer subtle length over drama. If any earlier length number conflicts, obey this shorter cap.
```

### `rimel`

- **display:** Efecto Rímel
- **category:** `extensiones`

```text
Perform a photorealistic edit applying Mascara-Effect Eyelash Extensions to the user's upper eyelids. Direct root attachment of thick dark fibers along the upper eyelid lash line, following lid geometry. Use single thick-gauge jet-black fibers per natural lash, producing a dark wet mascara appearance without fluffy multi-strand fans. Apply strong C/D curl following a length mapping sequence of 6mm inner corner, 7mm, 7mm, 8mm, peaking at 8mm above the pupil, tapering to 8mm and 7mm at the outer corner. Maintain original face shape, skin texture, eyelid fold, iris pigment, facial lighting, and surrounding skin detail with 100% fidelity. Do not add fluffy volume fans, spider-leg clumps, smudged mascara stains on skin, floating lash lines, cartoonish brows, or altered facial geometry. Apply deep black mascara-effect single-fiber eyelash extensions with defined thick structure and 8 to 7mm central open-eye mapping anchored smoothly to the natural lash line. CRITICAL FINAL INSTRUCTION: Keep lashes SHORT and salon-wearable. Tips must stay in the lower third of the space between the upper lash line and the eyebrow. Never approach or touch the brow. Prefer subtle length over drama. If any earlier length number conflicts, obey this shorter cap.
```

### `mojado_wet`

- **display:** Efecto Mojado (Wet Look)
- **category:** `extensiones`

```text
Perform a photorealistic edit applying Wet-Look Eyelash Extensions across the upper lash line. Securely anchor closed lash spikes directly onto the upper lash margin with precise shadow integration. Group closed volume fans into narrow pointed spikes with a glossy wet sheen finish. Apply crisp D-curl with length sequence: 6mm inner corner, 7mm, jumping to 8mm and 8mm mid-eye spikes, tapering down to 8mm and 7mm at the outer edge. Preserve 100% of facial features, skin grain, eye color, eyebrow structure, background lighting, and original shadows. Edit only upper eyelashes. Do not create open fluffy volume fans, matte plastic textures, smudged eyeliner marks, disconnected floating lashes, or artificial skin blurring. Apply glossy wet-look closed-fan lash spikes with high specular highlights anchored along the upper eyelid following a 7 to 6mm textured mapping. CRITICAL FINAL INSTRUCTION: Keep lashes SHORT and salon-wearable. Tips must stay in the lower third of the space between the upper lash line and the eyebrow. Never approach or touch the brow. Prefer subtle length over drama. If any earlier length number conflicts, obey this shorter cap.
```

### `vol_tec_3d_natural`

- **display:** Vol. Tecnológico 3D - Natural
- **category:** `extensiones`

```text
Perform a photorealistic edit applying 3D Technological Volume Eyelash Extensions in a Natural Map layout. Anchor the base of each 3-fiber fan seamlessly to the natural upper lash root line. Use pre-made 3D Y/W shape light synthetic fans with 3 ultra-fine fibers per fan, creating a soft uniform lash line density. Apply soft C-curl in a natural arc contouring: 6mm inner corner, 7mm, 7mm, peaking at 8mm mid-eye, tapering to 8mm, 7mm, and 7mm at the outer corner. Retain 100% original facial structure, real skin pores, original eye iris details, natural lighting, and original background. Do not apply heavy solid black blocks, 4D or Mega volume density, uneven gaps, floating strip lashes, plastic sheen, or altered face proportions. Apply soft 3D technological light volume fans integrated smoothly along upper eyelids with a balanced 8 to 6mm natural arch map. CRITICAL FINAL INSTRUCTION: Keep lashes SHORT and salon-wearable. Tips must stay in the lower third of the space between the upper lash line and the eyebrow. Never approach or touch the brow. Prefer subtle length over drama. If any earlier length number conflicts, obey this shorter cap.
```

### `vol_tec_3d_ardilla`

- **display:** Vol. Tecnológico 3D - Efecto Ardilla
- **category:** `extensiones`

```text
Perform a photorealistic edit applying 3D Technological Volume Eyelash Extensions in Squirrel Effect mapping. Anchor lash fan roots directly along the upper lid line following eye curvature. Use soft 3D ultra-fine fans evenly spaced to lift and frame the outer-mid eye section. Apply C/D mix curl with length sequence: 6mm inner, 7mm, 7mm, 8mm, peaking at 8mm at the outer-center curve under the brow arch, dropping to 8mm and 7mm at the outermost corner. Preserve user identity, skin texture, iris details, facial structure, and existing lighting completely. Do not create Cat Eye outer-edge extension, flat solid black density, fake plastic shine, disconnected lash band, or skin retouching. Apply 3D technological volume eyelash extensions with squirrel mapping peaking at 6mm under the outer brow arch, blending softly into the upper lash line. CRITICAL FINAL INSTRUCTION: Keep lashes SHORT and salon-wearable. Tips must stay in the lower third of the space between the upper lash line and the eyebrow. Never approach or touch the brow. Prefer subtle length over drama. If any earlier length number conflicts, obey this shorter cap.
```

### `vol_tec_3d_cat_eyes`

- **display:** Vol. Tecnológico 3D - Cat Eyes
- **category:** `extensiones`

```text
Perform a photorealistic edit applying 3D Technological Volume Eyelash Extensions with Cat Eyes mapping. Anchor 3D light volume fans precisely along the upper lid line from inner to outer corner. Position soft 3D Y/W fans angled slightly outward toward the outer temple to elongate the eye shape. Apply progressive ascending lengths using strong D/CC curl: 6mm inner corner, 7mm, 7mm, 8mm, 8mm, 8mm, peaking softly at 9mm length at the far outer corner. Preserve 100% face shape, real skin pores, original eye color, lighting conditions, and background. Do not place peak length in the eye center, create harsh heavy block shadows, artificial eye color, or floating strip lash edges. Apply elongating 3D volume eyelash extensions with progressive 7 to 9mm cat-eye mapping angled smoothly outward along the upper lash line. CRITICAL FINAL INSTRUCTION: Keep lashes SHORT and salon-wearable. Tips must stay in the lower third of the space between the upper lash line and the eyebrow. Never approach or touch the brow. Prefer subtle length over drama. If any earlier length number conflicts, obey this shorter cap.
```

### `vol_tec_3d_ojo_abierto`

- **display:** Vol. Tecnológico 3D - Ojo Abierto
- **category:** `extensiones`

```text
Perform a photorealistic edit applying 3D Technological Volume Eyelash Extensions in Open Eye mapping. Embed roots directly along the upper eyelid margin. Orient lightweight 3D volume fans vertically above the pupil to maximize vertical eye opening. Apply high D-curl in a symmetrical center-focused mapping: 6mm inner corner, 7mm, 8mm, peaking at 8mm directly above the pupil, tapering back down to 8mm and 7mm at the outer corner. Retain complete fidelity of face geometry, skin grain, original eyes, ambient lighting, and surroundings. Do not elongate outer corners, generate dense solid black masses, smooth skin artificially, or alter face proportions. Apply vertical-lifting 3D volume eyelash extensions with open-eye mapping peaking at 6mm over the center pupil area along the upper lash line. CRITICAL FINAL INSTRUCTION: Keep lashes SHORT and salon-wearable. Tips must stay in the lower third of the space between the upper lash line and the eyebrow. Never approach or touch the brow. Prefer subtle length over drama. If any earlier length number conflicts, obey this shorter cap.
```

### `vol_tec_4d_natural`

- **display:** Vol. Tecnológico 4D - Natural
- **category:** `extensiones`

```text
Perform a photorealistic edit applying 4D Technological Volume Eyelash Extensions in Natural Map configuration. Perform precise root insertion of 4D fans into the upper lash line. Use 4fiber lightweight Y/W fans creating dense velvet coverage across the lash bed while maintaining individual tip separation. Apply C-curl in a balanced arc map: 6mm inner corner, 7mm, 7mm, peaking at 8mm in the center, tapering to 8mm, 7mm, and 7mm at the outer corner. Ensure 100% preservation of client face shape, skin texture, eyelid anatomy, iris color, and lighting. Do not render plastic block shadows, fake eyeliner paint, floating lash band, airbrushed skin, or distorted eyes. Apply dense velvety 4D technological volume eyelash extensions integrated softly along upper lids following an 8 to 6mm natural arc map. CRITICAL FINAL INSTRUCTION: Keep lashes SHORT and salon-wearable. Tips must stay in the lower third of the space between the upper lash line and the eyebrow. Never approach or touch the brow. Prefer subtle length over drama. If any earlier length number conflicts, obey this shorter cap.
```

### `vol_tec_4d_ardilla`

- **display:** Vol. Tecnológico 4D - Efecto Ardilla
- **category:** `extensiones`

```text
Perform a photorealistic edit applying 4D Technological Volume Eyelash Extensions in Squirrel Effect mapping. Root every 4D fan directly into the upper eyelash margin following the natural eye arch. Use 4-fiber lightweight Y/W synthetic fans spaced evenly creating a velvety lash density. Apply a strong C/D curl combination with length mapping of 6mm inner corner, 7mm, 7mm, 8mm, peaking at 8mm at the outer-center curve directly under the brow arch, dropping to 8mm and 7mm at the outer edge. Preserve 100% of facial identity, real skin pores, eye iris color, facial bone structure, surrounding eyebrow shape, lighting, and original background. Edit exclusively the upper eyelash fibers. Do not create Cat Eye outer-edge extension, solid block shadows, floating strip lash bands, artificial plastic sheen, airbrushed skin, or changed eye color. Apply dense 4D technological volume eyelash extensions with squirrel mapping peaking at 6mm under the outer brow arch seamlessly rooted along the upper eyelid. CRITICAL FINAL INSTRUCTION: Keep lashes SHORT and salon-wearable. Tips must stay in the lower third of the space between the upper lash line and the eyebrow. Never approach or touch the brow. Prefer subtle length over drama. If any earlier length number conflicts, obey this shorter cap.
```

### `vol_tec_4d_cat_eyes`

- **display:** Vol. Tecnológico 4D - Cat Eyes
- **category:** `extensiones`

```text
Perform a photorealistic edit applying 4D Technological Volume Eyelash Extensions with Cat Eyes mapping. Direct root attachment of 4D light fans along the upper lid margin from inner to outer corner. Position velvety 4-fiber fans angled outward toward the temples to achieve an elongated feline lift. Apply strong D/CC curl with progressive length map: 6mm inner corner, 7mm, 7mm, 8mm, 8mm, 8mm, peaking softly at 9mm at the outer corner. Maintain 100% original face shape, skin texture, eyelid fold, iris color, lighting direction, and background. Do not place peak lengths in the eye center, produce flat black block cutouts, smooth skin artificially, or alter natural brow lines. Apply deep velvety 4D volume eyelash extensions with progressive 7 to 9mm cat-eye mapping angled smoothly outward along the upper lash line. CRITICAL FINAL INSTRUCTION: Keep lashes SHORT and salon-wearable. Tips must stay in the lower third of the space between the upper lash line and the eyebrow. Never approach or touch the brow. Prefer subtle length over drama. If any earlier length number conflicts, obey this shorter cap.
```

### `hawaiana`

- **display:** Efecto Hawaiana
- **category:** `extensiones`

```text
Perform a photorealistic edit applying Hawaiana Effect Eyelash Extensions across the upper eyelids. Root base extensions directly into the upper lash bed with soft defined peak alignment. Create alternating soft textured peaks integrated over a delicate base layer delivering an open fresh airy gaze. Apply smooth C/D curl with symmetrical map sequence: 6mm inner corner, 7mm, 7mm, 8mm, peaking at 8mm in the center, tapering to 8mm, 7mm, and 7mm at the outer corner. Preserve 100% of facial identity, face shape, iris pigment, skin texture, lighting, and original background. Do not generate heavy block volume, subtle disjointed spikes, plastic sticker appearance, blurred eyelid skin, or modified facial geometry. Apply softly defined Hawaiana textured eyelash extensions with delicate peak structures along an 8 to 6mm balanced arch mapping. CRITICAL FINAL INSTRUCTION: Keep lashes SHORT and salon-wearable. Tips must stay in the lower third of the space between the upper lash line and the eyebrow. Never approach or touch the brow. Prefer subtle length over drama. If any earlier length number conflicts, obey this shorter cap.
```

### `fox`

- **display:** Efecto Fox
- **category:** `extensiones`

```text
Perform a photorealistic edit applying Fox Effect Eyelash Extensions with L-curl fiber stretching. Anchor flat L-curl base fibers directly into the upper eyelash margin directing outer fibers sharply toward the temple. Build light base density transitioning into light outer-corner emphasis with subtle diagonal alignment. Apply distinct L-curl lifting flat from the root following an ascending map: 6mm inner corner, 7mm, 7mm, 8mm, 8mm, 8mm, reaching 9mm modest peak length gently emphasized at the outermost corner. Preserve 100% facial features, skin pores, eye color, eyelid crease anatomy, ambient lighting, and background fidelity. Do not apply rounded C/D curls, center-focused volume, floating sticker overlays, artificial face reshaping, or airbrushed skin filtering. Apply feline-stretching Fox effect eyelash extensions using sharp L-curl fibers loaded heavily towards the outer corner in a 7 to 9mm map. CRITICAL FINAL INSTRUCTION: Keep lashes SHORT and salon-wearable. Tips must stay in the lower third of the space between the upper lash line and the eyebrow. Never approach or touch the brow. Prefer subtle length over drama. If any earlier length number conflicts, obey this shorter cap.
```

### `mega_volumen`

- **display:** Mega Volumen
- **category:** `extensiones`

```text
Perform a photorealistic edit applying Mega Volume Eyelash Extensions along the upper eyelids. Anchor high-density micro-fan bases seamlessly along the upper lid lash line creating a clean black eyeliner lash-line effect. Apply handmade fans of 10 to 16 ultra-fine fibers per natural lash, forming a dense defined black velvet canopy with delicate feather-soft tips. Apply strong D-curl in a symmetrical center map: 6mm inner corner, 7mm, 7mm, peaking at 8mm in the center, tapering down to 8mm, 7mm, and 7mm at the outer corner. Retain 100% original facial structure, iris pigment, eyelid skin grain, facial shadows, lighting, and original background setup. Do not generate solid plastic ink blocks, smudged shadow paint, floating artificial strip edges, smoothed skin texture, or distorted eye proportions. Apply full dark velvet Mega Volume eyelash extensions featuring 10-16 fiber fans integrated along an 8 to 6mm symmetrical center mapping. CRITICAL FINAL INSTRUCTION: Keep lashes SHORT and salon-wearable. Tips must stay in the lower third of the space between the upper lash line and the eyebrow. Never approach or touch the brow. Prefer subtle length over drama. If any earlier length number conflicts, obey this shorter cap.
```

### `wispy_glam`

- **display:** Wispy / Wispy Glam
- **category:** `extensiones`

```text
Perform a photorealistic edit applying Wispy Glam Eyelash Extensions along the upper eyelid. Anchor layered lash bases directly into upper eyelid skin margin with natural drop shadows. Construct a soft volume base layer studded with prominent narrow long spikes creating a deliberate textured fringe. Apply mixed C/D curl in a symmetrical spike mapping: 6mm base inner corner, rising to 7mm, 8mm, peaking with 8mm central spikes, tapering back through 8mm, 8mm, and 7mm at the outer corner. Preserve 100% user identity, eye color, fine skin detail, natural lighting, surrounding eyebrows, and background environment. Do not apply flat uniform lash lines, heavy plastic blocks, smudged eyeliner marks, altered facial anatomy, or skin airbrushing. Apply multi-layered Wispy Glam textured eyelash extensions featuring prominent feather-soft spikes following a 7 to 6mm alternating length map. CRITICAL FINAL INSTRUCTION: Keep lashes SHORT and salon-wearable. Tips must stay in the lower third of the space between the upper lash line and the eyebrow. Never approach or touch the brow. Prefer subtle length over drama. If any earlier length number conflicts, obey this shorter cap.
```

### `anime`

- **display:** Efecto Anime
- **category:** `extensiones`
- **ref-bank:** `look-preview-refs/anime/anime-ref1.jpg` (GO 06-sep)
- **nota QA:** canónico cerrado 06-sep (Avril): **7 espigas**, solo superiores, sin ancla de ceja/pliegue; ref-bank `anime-ref1`.

```text
Style = EXACTLY 7 Manga/Anime SPIKES only: about 7 pointed spike clusters per eye, WIDELY SPACED, with visible gaps filled by shorter, sparse base lashes as in image (2). Keep only the spike PATTERN from image (2). Edit UPPER lashes only. Leave lower lashes 100% natural and untouched — no spikes, no extensions, no thickening on the lower lid. Photorealistic edit on image (1), the client selfie. Root spikes directly into the upper lash line. Subtle anime/manga lift with D-curl. Preserve 100% face, pores, nose, iris, lighting, and background. FORBIDDEN: lower-lash spikes or lower extensions, Mega Volume, dense velvet canopy, continuous volume fans, solid black lash wall, cat-eye mega fringe, sticker cutouts, geometric cartoon spikes, blurred lids, changed identity. Image (2) is a STYLE reference for UPPER spike COUNT, SPACING, and high-low RHYTHM only — do NOT copy its absolute length or density if denser or longer than this brief; ignore any lower lashes in image (2). Keep client identity from (1). Preserve the exact aspect ratio and framing of image (1) — do not adopt image (2)'s aspect ratio.
```

### `micro_doll_eye`

- **display:** Combo Mirada Espectacular (Microblading + Efecto Muñeca)
- **category:** `combo_mirada`

```text
Perform a photorealistic dual edit applying Hair-by-Hair Eyebrow Microblading and Doll-Eye Mascara-Fiber Eyelash Extensions to the user's upper face. For eyebrows, map fine crisp hair strokes following the natural brow bone arch with a soft pigment gradient lighter at the head and darker towards the arch and tail, blending seamlessly with natural hairs. For lashes, root dark thick mascara-fiber extensions along the upper lid margin with Doll-Eye mapping, placing modest peak length and volume at the center directly above the pupil peaking at 6mm, tapering down to 8mm and 6mm at the inner and outer corners using strong D-curl. Maintain 100% fidelity of original face shape, skin texture, fine pores, iris color, forehead grain, natural lighting, and background. Do not apply cartoonish block brows, floating lash stickers, unnatural sharp cutouts, altered face proportions, airbrushed skin, or changed eye color. Apply combined hair-by-hair eyebrow microblading with natural arch gradient and centered doll-eye mascara-fiber eyelash extensions anchored precisely to upper eyelids. CRITICAL FINAL INSTRUCTION: Keep lashes SHORT and salon-wearable. Tips must stay in the lower third of the space between the upper lash line and the eyebrow. Never approach or touch the brow. Prefer subtle length over drama. If any earlier length number conflicts, obey this shorter cap.
```

### `lifting_pestanas`

- **display:** Lifting de Pestañas
- **category:** `lifting`

```text
Perform a photorealistic edit applying a Lash Lift and Tint to the user's natural upper eyelashes. Lift the client's existing natural upper eyelashes directly from the root with an upward curve opening the eye gaze. Intensify natural lash hair pigment to a glossy deep jet-black shade, emphasizing strand-by-strand separation as if lightly coated in tint. Do not add synthetic fiber extensions or artificial lash clusters. Preserve 100% of original facial features, eyelid skin texture, eye color, natural brow structure, lighting, and background. Do not add synthetic volume extensions, heavy false lash clusters, smudged skin makeup, floating lashes, or artificial face smoothing. Apply elevated and deep-black tinted natural upper eyelashes lifted directly from the root with perfect strand separation. CRITICAL FINAL INSTRUCTION: Keep natural lifted lashes SHORT (no extension length) and salon-wearable. Tips must stay in the lower third of the space between the upper lash line and the eyebrow. Never approach or touch the brow. Prefer subtle length over drama. If any earlier length number conflicts, obey this shorter cap.
```

### `cejas_diseno`

- **display:** Diseño y Depilación de Cejas
- **category:** `cejas`

```text
Perform a photorealistic edit applying Eyebrow Design and Shaping to the user's eyebrows. Clean and sharpen the upper and lower eyebrow borders, removing stray micro-hairs around the brow arch and bridge of the nose. Define a crisp symmetrical eyebrow contour aligned with the client's natural brow bone curvature while maintaining natural hair growth patterns. Retain 100% of facial structure, skin texture, fine pores, original eye iris, natural lighting, and original background. Do not tattoo microblading strokes, apply laminated vertical gloss, create solid sharp sharpie-pen brows, or airbrush skin around the eyes. Apply cleanly shaped and defined eyebrows with pristine skin borders following the client's natural arch.
```

### `cejas_laminado`

- **display:** Laminado de Cejas
- **category:** `cejas`

```text
Perform a photorealistic edit applying Eyebrow Lamination to the user's eyebrows. Lift and brush original eyebrow hairs upward and outward in a soft feathered brushed-up configuration along the brow bone. Create a sleek uniform semi-glossy setting effect across existing natural hairs, enhancing brow volume and width without tattoo pigments. Preserve 100% facial identity, natural skin texture, eyelid fold, iris color, lighting, and original background. Do not draw microblading skin strokes, create solid painted block brows, alter forehead anatomy, or blur skin texture. Apply brushed-up feathered laminated eyebrows with sleek hair directional alignment and subtle glossy setting sheen.
```

### `microblading_solo`

- **display:** Microblading de Cejas
- **category:** `microblading`

```text
Perform a photorealistic edit applying Hair-by-Hair Eyebrow Microblading to the user's eyebrows. Draw fine crisp hyper-realistic individual hair strokes strictly following the natural brow bone arch and hair orientation. Create a natural pigment gradient with lighter feather-soft strokes at the brow head and darker defined density through the arch and tail, blending seamlessly into real hairs. Maintain 100% original face shape, skin pores, eye shape, eyelashes, facial lighting, and background setup. Edit brows only. Do not alter eyelashes, paint solid block tattoo brows, create sharp sticker outlines, alter eye color, or airbrush forehead skin. Apply precision hair-by-hair microblading strokes following natural eyebrow anatomy with realistic pigment gradient.
```

### `hidralips`

- **display:** Hidra Lips / Labios
- **category:** `hidralips`

```text
Perform a photorealistic edit applying Hidra Lips hydration and subtle tint treatment to the user's lips. Follow the client's original lip vermilion border precisely without overlining or altering natural mouth anatomy. Apply a translucent juicy hydration sheen with a soft rosy pigment gradient, smoothing dry lip lines while preserving natural lip wrinkles and pore details. Preserve 100% of skin tone, facial features, teeth, eyes, nose, background, and overall lighting. Edit strictly the lip surface. Do not artificially enlarge lip volume boundaries, create opaque matte lipstick finish, add floating gloss stickers, or distort face shape. Apply deeply hydrated juicy lips with a natural translucent rosy tint, soft specular highlights, and preserved lip texture.
```

### `unas_gel_natural`

- **display:** Manicure Gel Natural (Rubber / Kapping)
- **category:** `unas`

```text
Perform a photorealistic edit applying a Natural Gel Manicure onto the client's nails. Seamlessly fit high-gloss gel coating along the cuticle line and lateral sidewalls without flooding skin. Create a smooth natural nail apex curve with a glass-like clear glossy topcoat reflecting ambient room light while preserving original nail length and finger proportions. Retain 100% of skin tone, hand skin texture, knuckles, fingerprints, finger shape, and background. Do not add fake press-on tips, floating acrylic overlays, opaque painted skin, distorted fingers, or fake nail art. Apply high-gloss clean gel polish overlay on natural nails with flawless cuticle integration and soft light reflection.
```

### `unas_diseno_simple`

- **display:** Manicure en Gel con Diseño Soft
- **category:** `unas`

```text
Perform a photorealistic edit applying a Soft Salon Gel Nail Art Design onto the client's hands. Align soft gel extensions or overlay precisely onto natural nail beds with smooth cuticle transition. Apply a sophisticated soft salon design such as a delicate micro-French tip or subtle Baby Boomer gradient with glossy gel apex and realistic light highlights. Preserve 100% original hand skin texture, tone, knuckles, finger proportions, and background setup. Do not add extreme 3D charms, floating press-on stickers, messy cuticle paint, blurred fingers, or altered hand geometry. Apply elegant soft gel nail design with pristine glossy finish seamlessly integrated onto the client's natural nail beds.
```

