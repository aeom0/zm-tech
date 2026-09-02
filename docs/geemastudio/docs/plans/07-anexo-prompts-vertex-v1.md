# Anexo Plan 07 — Prompts Vertex v1 (Gemini + guías Vanessa)

> **Fuente:** chat Gemini + flyers ZM (`efectos-ext-pestañas`, `vol-tec-3d/4d`, `mirada-espectacular-1/2`).
> **Origen:** PDF Batch 1 + continue chat 02-sep-2026 (estilos 9–23).
> **Uso:** campo `prompt_template` → `vertexGeminiImageEdit({ prompt })`.
> **Estado:** **23/23** style_keys completos.

Plan padre: [`07-PLAN-look-preview-multi-servicio.md`](./07-PLAN-look-preview-multi-servicio.md).

## Cobertura

| # | style_key | display | category | mapping_mm | Estado |
|---|-----------|---------|----------|------------|--------|
| 1 | `clasicas` | Extensiones Clásicas | `extensiones` | 7-8-9-10-11-10-9-8 mm | ✅ v1 |
| 2 | `rimel` | Efecto Rímel | `extensiones` | 8-9-10-11-12-11-10 mm | ✅ v1 |
| 3 | `mojado_wet` | Efecto Mojado (Wet Look) | `extensiones` | 7-8-10-12-12-10-8 mm | ✅ v1 |
| 4 | `vol_tec_3d_natural` | Vol. Tecnológico 3D - Natural | `extensiones` | 8-9-10-11-10-9-8 mm | ✅ v1 |
| 5 | `vol_tec_3d_ardilla` | Vol. Tecnológico 3D - Efecto Ardilla | `extensiones` | 7-8-9-10-12-11-9 mm | ✅ v1 |
| 6 | `vol_tec_3d_cat_eyes` | Vol. Tecnológico 3D - Cat Eyes | `extensiones` | 7-8-9-10-11-12-13 mm | ✅ v1 |
| 7 | `vol_tec_3d_ojo_abierto` | Vol. Tecnológico 3D - Ojo Abierto | `extensiones` | 7-8-10-12-12-10-7 mm | ✅ v1 |
| 8 | `vol_tec_4d_natural` | Vol. Tecnológico 4D - Natural | `extensiones` | 8-9-10-11-10-9-8 mm | ✅ v1 |
| 9 | `vol_tec_4d_ardilla` | Vol. Tecnológico 4D - Efecto Ardilla | `extensiones` | 7-8-9-10-12-11-9 mm | ✅ v1 |
| 10 | `vol_tec_4d_cat_eyes` | Vol. Tecnológico 4D - Cat Eyes | `extensiones` | 7-8-9-10-11-12-13 mm | ✅ v1 |
| 11 | `hawaiana` | Efecto Hawaiana | `extensiones` | 7-8-9-10-11-10-9-8 mm | ✅ v1 |
| 12 | `fox` | Efecto Fox | `extensiones` | 7-8-9-10-11-12-13 mm | ✅ v1 |
| 13 | `mega_volumen` | Mega Volumen | `extensiones` | 8-9-10-11-10-9-8 mm | ✅ v1 |
| 14 | `wispy_glam` | Wispy / Wispy Glam | `extensiones` | 7-9-11-12-11-9-7 mm | ✅ v1 |
| 15 | `anime` | Efecto Anime | `extensiones` | 6-8-10-12-12-10-8-6 mm | ✅ v1 |
| 16 | `micro_doll_eye` | Combo Mirada Espectacular (Microblading + Efecto Muñeca) | `combo_mirada` | 7-8-10-12-12-10-8 mm (pestañas) | ✅ v1 |
| 17 | `lifting_pestanas` | Lifting de Pestañas | `lifting` | n/a | ✅ v1 |
| 18 | `cejas_diseno` | Diseño y Depilación de Cejas | `cejas` | n/a | ✅ v1 |
| 19 | `cejas_laminado` | Laminado de Cejas | `cejas` | n/a | ✅ v1 |
| 20 | `microblading_solo` | Microblading de Cejas | `microblading` | n/a | ✅ v1 |
| 21 | `hidralips` | Hidra Lips / Labios | `hidralips` | n/a | ✅ v1 |
| 22 | `unas_gel_natural` | Manicure Gel Natural (Rubber / Kapping) | `unas` | n/a | ✅ v1 |
| 23 | `unas_diseno_simple` | Manicure en Gel con Diseño Soft | `unas` | n/a | ✅ v1 |

## Prompts listos (VERTEX_READY_PROMPT)

### `clasicas`

- **display_name_es:** Extensiones Clásicas
- **category_key:** `extensiones`
- **technique_note_es:** 1:1, una fibra sintética ligera adherida por cada pestaña natural.
- **mapping_mm:** `7-8-9-10-11-10-9-8 mm`
- **visual_diff:** A diferencia del Volumen Tecnológico o Mega Volumen, no forma abanicos ni aporta densidad masiva; mantiene una separación impecable hilo por hilo con acabado natural.

```text
Perform a photorealistic edit applying 1:1 Classic Eyelash Extensions to the user's upper lash line. Root every synthetic lash fiber individually into the natural upper eyelid lash line following the organic lid contour. Apply exactly 1 single synthetic fiber attached per 1 natural lash with clear isolation between every strand and zero clumping. Apply a smooth C-curl following a length mapping sequence from 7mm at the inner corner, 8mm, 9mm, 10mm, peaking at 11mm mid-eye, tapering down to 10mm, 9mm, and 8mm at the outer corner. Preserve 100% of original facial identity, face shape, iris color, skin pores, fine lines, surrounding brow structure, lighting, and background. Edit exclusively the upper eyelash fibers. Do not create volume fans, clustered clumps, heavy mascara coating, floating fibers, plastic sticker look, blurred eyelid edges, skin smoothing, or altered eye color. Apply individual 1:1 classic eyelash extensions, perfectly isolated single fibers seamlessly attached along the upper lash line following the 7 to 11 mm natural arc mapping with realistic fiber sheen.
```

### `rimel`

- **display_name_es:** Efecto Rímel
- **category_key:** `extensiones`
- **technique_note_es:** 1:1 con fibra gruesa de intensidad de mascara de pestañas.
- **mapping_mm:** `8-9-10-11-12-11-10 mm`
- **visual_diff:** Utiliza fibras individuales de mayor grosor y pigmentación oscura para imitar la apariencia de rímel fresco sin la densidad de abanicos 3D/4D.

```text
Perform a photorealistic edit applying Mascara-Effect Eyelash Extensions to the user's upper eyelids. Direct root attachment of thick dark fibers along the upper eyelid lash line, following lid geometry. Use single thick-gauge jet-black fibers per natural lash, producing a dark wet mascara appearance without fluffy multi-strand fans. Apply strong C/D curl following a length mapping sequence of 8mm inner corner, 9mm, 10mm, 11mm, peaking at 12mm above the pupil, tapering to 11mm and 10mm at the outer corner. Maintain original face shape, skin texture, eyelid fold, iris pigment, facial lighting, and surrounding skin detail with 100% fidelity. Do not add fluffy volume fans, spider-leg clumps, smudged mascara stains on skin, floating lash lines, cartoonish brows, or altered facial geometry. Apply deep black mascara-effect single-fiber eyelash extensions with defined thick structure and 8 to 12 mm central open-eye mapping anchored smoothly to the natural lash line.
```

### `mojado_wet`

- **display_name_es:** Efecto Mojado (Wet Look)
- **category_key:** `extensiones`
- **technique_note_es:** Abanicos cerrados de fibras finas que simulan un acabado recién salido del agua.
- **mapping_mm:** `7-8-10-12-12-10-8 mm`
- **visual_diff:** A diferencia del Efecto Ardilla o Rímel, presenta picos de abanicos cerrados con un brillo húmedo reflectante característico.

```text
Perform a photorealistic edit applying Wet-Look Eyelash Extensions across the upper lash line. Securely anchor closed lash spikes directly onto the upper lash margin with precise shadow integration. Group closed volume fans into narrow pointed spikes with a glossy wet sheen finish. Apply crisp D-curl with length sequence: 7mm inner corner, 8mm, jumping to 10mm and 12mm mid-eye spikes, tapering down to 10mm and 8mm at the outer edge. Preserve 100% of facial features, skin grain, eye color, eyebrow structure, background lighting, and original shadows. Edit only upper eyelashes. Do not create open fluffy volume fans, matte plastic textures, smudged eyeliner marks, disconnected floating lashes, or artificial skin blurring. Apply glossy wet-look closed-fan lash spikes with high specular highlights anchored along the upper eyelid following a 7 to 12 mm textured mapping.
```

### `vol_tec_3d_natural`

- **display_name_es:** Vol. Tecnológico 3D - Natural
- **category_key:** `extensiones`
- **technique_note_es:** 3D=3 fibras ultraligeras por abanico en Y/W, volumen suave y equilibrado.
- **mapping_mm:** `8-9-10-11-10-9-8 mm`
- **visual_diff:** Proporciona mayor densidad que las Clásicas pero mantiene una distribución homogénea en forma de arco sin acentuar extremos ni centro.

```text
Perform a photorealistic edit applying 3D Technological Volume Eyelash Extensions in a Natural Map layout. Anchor the base of each 3-fiber fan seamlessly to the natural upper lash root line. Use pre-made 3D Y/W shape light synthetic fans with 3 ultra-fine fibers per fan, creating a soft uniform lash line density. Apply soft C-curl in a natural arc contouring: 8mm inner corner, 9mm, 10mm, peaking at 11mm mid-eye, tapering to 10mm, 9mm, and 8mm at the outer corner. Retain 100% original facial structure, real skin pores, original eye iris details, natural lighting, and original background. Do not apply heavy solid black blocks, 4D or Mega volume density, uneven gaps, floating strip lashes, plastic sheen, or altered face proportions. Apply soft 3D technological light volume fans integrated smoothly along upper eyelids with a balanced 8 to 11 mm natural arch map.
```

### `vol_tec_3d_ardilla`

- **display_name_es:** Vol. Tecnológico 3D - Efecto Ardilla
- **category_key:** `extensiones`
- **technique_note_es:** 3D=3 fibras; punto de máxima longitud posicionado en el centro-exterior.
- **mapping_mm:** `7-8-9-10-12-11-9 mm`
- **visual_diff:** Desplaza el pico de longitud hacia el hueso de la ceja (centro-exterior) para abrir y redondear miradas con párpado encapuchado.

```text
Perform a photorealistic edit applying 3D Technological Volume Eyelash Extensions in Squirrel Effect mapping. Anchor lash fan roots directly along the upper lid line following eye curvature. Use soft 3D ultra-fine fans evenly spaced to lift and frame the outer-mid eye section. Apply C/D mix curl with length sequence: 7mm inner, 8mm, 9mm, 10mm, peaking at 12mm at the outer-center curve under the brow arch, dropping to 11mm and 9mm at the outermost corner. Preserve user identity, skin texture, iris details, facial structure, and existing lighting completely. Do not create Cat Eye outer-edge extension, flat solid black density, fake plastic shine, disconnected lash band, or skin retouching. Apply 3D technological volume eyelash extensions with squirrel mapping peaking at 12mm under the outer brow arch, blending softly into the upper lash line.
```

### `vol_tec_3d_cat_eyes`

- **display_name_es:** Vol. Tecnológico 3D - Cat Eyes
- **category_key:** `extensiones`
- **technique_note_es:** 3D=3 fibras; alargamiento progresivo desde el lagrimal hasta el canto externo.
- **mapping_mm:** `7-8-9-10-11-12-13 mm`
- **visual_diff:** Aumenta la longitud de forma estrictamente ascendente hacia el extremo exterior a diferencia de la distribución en arco de la opción Natural.

```text
Perform a photorealistic edit applying 3D Technological Volume Eyelash Extensions with Cat Eyes mapping. Anchor 3D light volume fans precisely along the upper lid line from inner to outer corner. Position soft 3D Y/W fans angled slightly outward toward the outer temple to elongate the eye shape. Apply progressive ascending lengths using strong D/CC curl: 7mm inner corner, 8mm, 9mm, 10mm, 11mm, 12mm, reaching a maximum 13mm length at the far outer corner. Preserve 100% face shape, real skin pores, original eye color, lighting conditions, and background. Do not place peak length in the eye center, create harsh heavy block shadows, artificial eye color, or floating strip lash edges. Apply elongating 3D volume eyelash extensions with progressive 7 to 13 mm cat-eye mapping angled smoothly outward along the upper lash line.
```

### `vol_tec_3d_ojo_abierto`

- **display_name_es:** Vol. Tecnológico 3D - Ojo Abierto
- **category_key:** `extensiones`
- **technique_note_es:** 3D=3 fibras; máxima longitud y curvatura concentrada en el centro del ojo.
- **mapping_mm:** `7-8-10-12-12-10-7 mm`
- **visual_diff:** Enfoca la altura en el centro para redondear ojos pequeños o almendrados, evitando el alargamiento lateral del Cat Eye.

```text
Perform a photorealistic edit applying 3D Technological Volume Eyelash Extensions in Open Eye mapping. Embed roots directly along the upper eyelid margin. Orient lightweight 3D volume fans vertically above the pupil to maximize vertical eye opening. Apply high D-curl in a symmetrical center-focused mapping: 7mm inner corner, 8mm, 10mm, peaking at 12mm directly above the pupil, tapering back down to 10mm and 7mm at the outer corner. Retain complete fidelity of face geometry, skin grain, original eyes, ambient lighting, and surroundings. Do not elongate outer corners, generate dense solid black masses, smooth skin artificially, or alter face proportions. Apply vertical-lifting 3D volume eyelash extensions with open-eye mapping peaking at 12mm over the center pupil area along the upper lash line.
```

### `vol_tec_4d_natural`

- **display_name_es:** Vol. Tecnológico 4D - Natural
- **category_key:** `extensiones`
- **technique_note_es:** 4D=4 fibras ultraligeras por abanico, mayor densidad con acabado aterciopelado.
- **mapping_mm:** `8-9-10-11-10-9-8 mm`
- **visual_diff:** Proporciona una línea de pestañas más oscura y llena que el 3D Natural sin perder la distribución suave en arco.

```text
Perform a photorealistic edit applying 4D Technological Volume Eyelash Extensions in Natural Map configuration. Perform precise root insertion of 4D fans into the upper lash line. Use 4fiber lightweight Y/W fans creating dense velvet coverage across the lash bed while maintaining individual tip separation. Apply C-curl in a balanced arc map: 8mm inner corner, 9mm, 10mm, peaking at 11mm in the center, tapering to 10mm, 9mm, and 8mm at the outer corner. Ensure 100% preservation of client face shape, skin texture, eyelid anatomy, iris color, and lighting. Do not render plastic block shadows, fake eyeliner paint, floating lash band, airbrushed skin, or distorted eyes. Apply dense velvety 4D technological volume eyelash extensions integrated softly along upper lids following an 8 to 11 mm natural arc map.
```

### `vol_tec_4d_ardilla`

- **display_name_es:** Vol. Tecnológico 4D - Efecto Ardilla
- **category_key:** `extensiones`
- **technique_note_es:** 4D=4 fibras ultraligeras por abanico, abriendo y redondeando la mirada en el punto centro-exterior.
- **mapping_mm:** `7-8-9-10-12-11-9 mm`
- **visual_diff:** Aporta mayor oscuridad y densidad aterciopelada que la versión 3D Ardilla, concentrando la elevación máxima debajo del arco de la ceja.

```text
Perform a photorealistic edit applying 4D Technological Volume Eyelash Extensions in Squirrel Effect mapping. Root every 4D fan directly into the upper eyelash margin following the natural eye arch. Use 4-fiber lightweight Y/W synthetic fans spaced evenly creating a velvety lash density. Apply a strong C/D curl combination with length mapping of 7mm inner corner, 8mm, 9mm, 10mm, peaking at 12mm at the outer-center curve directly under the brow arch, dropping to 11mm and 9mm at the outer edge. Preserve 100% of facial identity, real skin pores, eye iris color, facial bone structure, surrounding eyebrow shape, lighting, and original background. Edit exclusively the upper eyelash fibers. Do not create Cat Eye outer-edge extension, solid block shadows, floating strip lash bands, artificial plastic sheen, airbrushed skin, or changed eye color. Apply dense 4D technological volume eyelash extensions with squirrel mapping peaking at 12mm under the outer brow arch seamlessly rooted along the upper eyelid.
```

### `vol_tec_4d_cat_eyes`

- **display_name_es:** Vol. Tecnológico 4D - Cat Eyes
- **category_key:** `extensiones`
- **technique_note_es:** 4D=4 fibras ultraligeras con alargamiento progresivo hacia el canto externo.
- **mapping_mm:** `7-8-9-10-11-12-13 mm`
- **visual_diff:** Ofrece una línea de pestañas más tupida y profunda que el 3D Cat Eye, enfatizando el estiramiento felino en las comisuras exteriores.

```text
Perform a photorealistic edit applying 4D Technological Volume Eyelash Extensions with Cat Eyes mapping. Direct root attachment of 4D light fans along the upper lid margin from inner to outer corner. Position velvety 4-fiber fans angled outward toward the temples to achieve an elongated feline lift. Apply strong D/CC curl with progressive length map: 7mm inner corner, 8mm, 9mm, 10mm, 11mm, 12mm, reaching a maximum 13mm at the outer corner. Maintain 100% original face shape, skin texture, eyelid fold, iris color, lighting direction, and background. Do not place peak lengths in the eye center, produce flat black block cutouts, smooth skin artificially, or alter natural brow lines. Apply deep velvety 4D volume eyelash extensions with progressive 7 to 13 mm cat-eye mapping angled smoothly outward along the upper lash line.
```

### `hawaiana`

- **display_name_es:** Efecto Hawaiana
- **category_key:** `extensiones`
- **technique_note_es:** Picos suaves y definidos para una mirada abierta, ligera y descontracturada.
- **mapping_mm:** `7-8-9-10-11-10-9-8 mm`
- **visual_diff:** Se diferencia del Wispy Glam por tener picos más uniformes y sutiles sin cambios bruscos de longitud, ofreciendo una frescura natural.

```text
Perform a photorealistic edit applying Hawaiana Effect Eyelash Extensions across the upper eyelids. Root base extensions directly into the upper lash bed with soft defined peak alignment. Create alternating soft textured peaks integrated over a delicate base layer delivering an open fresh airy gaze. Apply smooth C/D curl with symmetrical map sequence: 7mm inner corner, 8mm, 9mm, 10mm, peaking at 11mm in the center, tapering to 10mm, 9mm, and 8mm at the outer corner. Preserve 100% of facial identity, face shape, iris pigment, skin texture, lighting, and original background. Do not generate heavy block volume, extreme disjointed spikes, plastic sticker appearance, blurred eyelid skin, or modified facial geometry. Apply softly defined Hawaiana textured eyelash extensions with delicate peak structures along an 8 to 11 mm balanced arch mapping.
```

### `fox`

- **display_name_es:** Efecto Fox
- **category_key:** `extensiones`
- **technique_note_es:** Fibra L con estiramiento felino y sobrecarga en el canto externo.
- **mapping_mm:** `7-8-9-10-11-12-13 mm`
- **visual_diff:** Utiliza fibra especializada en curvatura L para crear un ángulo rasgado y recto desde la raíz, diferenciándose del Cat Eye curvo tradicional.

```text
Perform a photorealistic edit applying Fox Effect Eyelash Extensions with L-curl fiber stretching. Anchor flat L-curl base fibers directly into the upper eyelash margin directing outer fibers sharply toward the temple. Build light base density transitioning into heavy outer-corner loading with extreme diagonal alignment. Apply distinct L-curl lifting flat from the root following an ascending map: 7mm inner corner, 8mm, 9mm, 10mm, 11mm, 12mm, reaching 13mm maximum length heavily loaded at the outermost corner. Preserve 100% facial features, skin pores, eye color, eyelid crease anatomy, ambient lighting, and background fidelity. Do not apply rounded C/D curls, center-focused volume, floating sticker overlays, artificial face reshaping, or airbrushed skin filtering. Apply feline-stretching Fox effect eyelash extensions using sharp L-curl fibers loaded heavily towards the outer corner in a 7 to 13 mm map.
```

### `mega_volumen`

- **display_name_es:** Mega Volumen
- **category_key:** `extensiones`
- **technique_note_es:** Abanicos de 10 a 16 fibras ultra finas por pestaña natural para máxima densidad.
- **mapping_mm:** `8-9-10-11-10-9-8 mm`
- **visual_diff:** Es la opción de mayor densidad y oscuridad de todo el catálogo; crea un efecto de delineado negro denso y tupido sin espacios visibles.

```text
Perform a photorealistic edit applying Mega Volume Eyelash Extensions along the upper eyelids. Anchor high-density micro-fan bases seamlessly along the upper lid lash line creating a clean black eyeliner lash-line effect. Apply handmade fans of 10 to 16 ultra-fine fibers per natural lash, forming a dense dramatic black velvet canopy with delicate feather-soft tips. Apply strong D-curl in a symmetrical center map: 8mm inner corner, 9mm, 10mm, peaking at 11mm in the center, tapering down to 10mm, 9mm, and 8mm at the outer corner. Retain 100% original facial structure, iris pigment, eyelid skin grain, facial shadows, lighting, and original background setup. Do not generate solid plastic ink blocks, smudged shadow paint, floating artificial strip edges, smoothed skin texture, or distorted eye proportions. Apply ultra-dense dark velvet Mega Volume eyelash extensions featuring 10-16 fiber fans integrated along an 8 to 11 mm symmetrical center mapping.
```

### `wispy_glam`

- **display_name_es:** Wispy / Wispy Glam
- **category_key:** `extensiones`
- **technique_note_es:** Picos largos desordenados e intercalados para movimiento y apertura ligera.
- **mapping_mm:** `7-9-11-12-11-9-7 mm`
- **visual_diff:** Combina una capa base corta con púas marcadamente más largas para crear una textura desestructurada tipo Kim Kardashian.

```text
Perform a photorealistic edit applying Wispy Glam Eyelash Extensions along the upper eyelid. Anchor layered lash bases directly into upper eyelid skin margin with natural drop shadows. Construct a soft volume base layer studded with prominent narrow long spikes creating a deliberate textured fringe. Apply mixed C/D curl in a symmetrical spike mapping: 7mm base inner corner, rising to 9mm, 11mm, peaking with 12mm central spikes, tapering back through 11mm, 9mm, and 7mm at the outer corner. Preserve 100% user identity, eye color, fine skin detail, natural lighting, surrounding eyebrows, and background environment. Do not apply flat uniform lash lines, heavy plastic blocks, smudged eyeliner marks, altered facial anatomy, or skin airbrushing. Apply multi-layered Wispy Glam textured eyelash extensions featuring prominent feather-soft spikes following a 7 to 12 mm alternating length map.
```

### `anime`

- **display_name_es:** Efecto Anime
- **category_key:** `extensiones`
- **technique_note_es:** Picos marcados y separados tipo muñequita en centro y puntas.
- **mapping_mm:** `6-8-10-12-12-10-8-6 mm`
- **visual_diff:** Presenta picos claramente aislados y más espaciados que el Wispy Glam, imitando la estética de pestañas Manga o Doll.

```text
Perform a photorealistic edit applying Anime Effect Eyelash Extensions across the upper eyelids. Root spike clusters precisely into upper lash line following lid curvature. Apply distinct widely spaced tall spikes standing out clearly from a shorter delicate base layer. Use extreme D-curl for vertical doll lift following a map sequence: 6mm inner corner, 8mm, 10mm, peaking at 12mm long central anime spikes, tapering down to 10mm, 8mm, and 6mm at the outer corner. Preserve 100% facial features, natural skin pores, original eye iris, ambient lighting, and background setup. Do not create uniform volume fans, continuous blocky lashes, artificial sticker cutouts, blurred eyelids, or changed facial features. Apply separated Anime-style lash spikes anchored along the upper eyelid creating an open doll-eye expression with a 6 to 12 mm mapped sequence.
```

### `micro_doll_eye`

- **display_name_es:** Combo Mirada Espectacular (Microblading + Efecto Muñeca)
- **category_key:** `combo_mirada`
- **technique_note_es:** Combinación de microblading pelo a pelo en cejas con pestañas fibra rímel efecto muñeca concentrado en el centro.
- **mapping_mm:** `7-8-10-12-12-10-8 mm (pestañas)`
- **visual_diff:** Edita simultáneamente cejas y pestañas; las cejas reciben trazos nítidos pelo a pelo y las pestañas destacan por una elevación central densa tipo rímel.

```text
Perform a photorealistic dual edit applying Hair-by-Hair Eyebrow Microblading and Doll-Eye Mascara-Fiber Eyelash Extensions to the user's upper face. For eyebrows, map fine crisp hair strokes following the natural brow bone arch with a soft pigment gradient lighter at the head and darker towards the arch and tail, blending seamlessly with natural hairs. For lashes, root dark thick mascara-fiber extensions along the upper lid margin with Doll-Eye mapping, placing maximum length and volume at the center directly above the pupil peaking at 12mm, tapering down to 7mm and 8mm at the inner and outer corners using strong D-curl. Maintain 100% fidelity of original face shape, skin texture, fine pores, iris color, forehead grain, natural lighting, and background. Do not apply cartoonish block brows, floating lash stickers, unnatural sharp cutouts, altered face proportions, airbrushed skin, or changed eye color. Apply combined hair-by-hair eyebrow microblading with natural arch gradient and centered doll-eye mascara-fiber eyelash extensions anchored precisely to upper eyelids.
```

### `lifting_pestanas`

- **display_name_es:** Lifting de Pestañas
- **category_key:** `lifting`
- **technique_note_es:** Elevación y curvatura de pestañas naturales desde la raíz con tintura oscura; SIN fibras sintéticas agregadas.
- **mapping_mm:** `n/a`
- **visual_diff:** Trabaja exclusivamente sobre las pestañas naturales de la clienta levantándolas y tiñéndolas, sin añadir el volumen o longitud de las extensiones.

```text
Perform a photorealistic edit applying a Lash Lift and Tint to the user's natural upper eyelashes. Lift the client's existing natural upper eyelashes directly from the root with an upward curve opening the eye gaze. Intensify natural lash hair pigment to a glossy deep jet-black shade, emphasizing strand-by-strand separation as if lightly coated in tint. Do not add synthetic fiber extensions or artificial lash clusters. Preserve 100% of original facial features, eyelid skin texture, eye color, natural brow structure, lighting, and background. Do not add synthetic volume extensions, heavy false lash clusters, smudged skin makeup, floating lashes, or artificial face smoothing. Apply elevated and deep-black tinted natural upper eyelashes lifted directly from the root with perfect strand separation.
```

### `cejas_diseno`

- **display_name_es:** Diseño y Depilación de Cejas
- **category_key:** `cejas`
- **technique_note_es:** Perfilado y depilación de la forma natural de la ceja sin micropigmentación ni laminado.
- **mapping_mm:** `n/a`
- **visual_diff:** Limpia y define el contorno eliminando vellos dispersos, manteniendo la textura natural del pelo sin la fijación vertical del laminado.

```text
Perform a photorealistic edit applying Eyebrow Design and Shaping to the user's eyebrows. Clean and sharpen the upper and lower eyebrow borders, removing stray micro-hairs around the brow arch and bridge of the nose. Define a crisp symmetrical eyebrow contour aligned with the client's natural brow bone curvature while maintaining natural hair growth patterns. Retain 100% of facial structure, skin texture, fine pores, original eye iris, natural lighting, and original background. Do not tattoo microblading strokes, apply laminated vertical gloss, create solid sharp sharpie-pen brows, or airbrush skin around the eyes. Apply cleanly shaped and defined eyebrows with pristine skin borders following the client's natural arch.
```

### `cejas_laminado`

- **display_name_es:** Laminado de Cejas
- **category_key:** `cejas`
- **technique_note_es:** Peinado, aliso y fijación vertical de los vellos naturales de la ceja con acabado pulido.
- **mapping_mm:** `n/a`
- **visual_diff:** Peina los vellos existentes hacia arriba y en diagonal fijándolos de forma feathery/fluffy, a diferencia del microblading que dibuja trazos sobre la piel.

```text
Perform a photorealistic edit applying Eyebrow Lamination to the user's eyebrows. Lift and brush original eyebrow hairs upward and outward in a soft feathered brushed-up configuration along the brow bone. Create a sleek uniform semi-glossy setting effect across existing natural hairs, enhancing brow volume and width without tattoo pigments. Preserve 100% facial identity, natural skin texture, eyelid fold, iris color, lighting, and original background. Do not draw microblading skin strokes, create solid painted block brows, alter forehead anatomy, or blur skin texture. Apply brushed-up feathered laminated eyebrows with sleek hair directional alignment and subtle glossy setting sheen.
```

### `microblading_solo`

- **display_name_es:** Microblading de Cejas
- **category_key:** `microblading`
- **technique_note_es:** Micropigmentación pelo a pelo para reestructurar y dar densidad a las cejas.
- **mapping_mm:** `n/a`
- **visual_diff:** Dibuja finas hiperrealistas líneas de pigmento en la piel imitando pelos naturales, diferente al laminado que solo peina el pelo existente.

```text
Perform a photorealistic edit applying Hair-by-Hair Eyebrow Microblading to the user's eyebrows. Draw fine crisp hyper-realistic individual hair strokes strictly following the natural brow bone arch and hair orientation. Create a natural pigment gradient with lighter feather-soft strokes at the brow head and darker defined density through the arch and tail, blending seamlessly into real hairs. Maintain 100% original face shape, skin pores, eye shape, eyelashes, facial lighting, and background setup. Edit brows only. Do not alter eyelashes, paint solid block tattoo brows, create sharp sticker outlines, alter eye color, or airbrush forehead skin. Apply precision hair-by-hair microblading strokes following natural eyebrow anatomy with realistic pigment gradient.
```

### `hidralips`

- **display_name_es:** Hidra Lips / Labios
- **category_key:** `hidralips`
- **technique_note_es:** Tratamiento de hidratación profunda con tinte natural y efecto de volumen jugoso.
- **mapping_mm:** `n/a`
- **visual_diff:** Modifica únicamente la zona labial aportando un tono rosado/coral fresco con brillo de hidratación profunda sin rellenos inyectables.

```text
Perform a photorealistic edit applying Hidra Lips hydration and subtle tint treatment to the user's lips. Follow the client's original lip vermilion border precisely without overlining or altering natural mouth anatomy. Apply a translucent juicy hydration sheen with a soft rosy pigment gradient, smoothing dry lip lines while preserving natural lip wrinkles and pore details. Preserve 100% of skin tone, facial features, teeth, eyes, nose, background, and overall lighting. Edit strictly the lip surface. Do not artificially enlarge lip volume boundaries, create opaque matte lipstick finish, add floating gloss stickers, or distort face shape. Apply deeply hydrated juicy lips with a natural translucent rosy tint, soft specular highlights, and preserved lip texture.
```

### `unas_gel_natural`

- **display_name_es:** Manicure Gel Natural (Rubber / Kapping)
- **category_key:** `unas`
- **technique_note_es:** Baño de gel sobre uña natural para refuerzo y brillo impecable.
- **mapping_mm:** `n/a`
- **visual_diff:** Mantiene el largo natural de las uñas del cliente aportando un acabado pulido con brillo gel cristalino, sin extensiones ni nail art.

```text
Perform a photorealistic edit applying a Natural Gel Manicure onto the client's nails. Seamlessly fit high-gloss gel coating along the cuticle line and lateral sidewalls without flooding skin. Create a smooth natural nail apex curve with a glass-like clear glossy topcoat reflecting ambient room light while preserving original nail length and finger proportions. Retain 100% of skin tone, hand skin texture, knuckles, fingerprints, finger shape, and background. Do not add fake press-on tips, floating acrylic overlays, opaque painted skin, distorted fingers, or fake nail art. Apply high-gloss clean gel polish overlay on natural nails with flawless cuticle integration and soft light reflection.
```

### `unas_diseno_simple`

- **display_name_es:** Manicure en Gel con Diseño Soft
- **category_key:** `unas`
- **technique_note_es:** Gel con diseño elegante de salón (French delicado, Baby Boomer o acento sutil).
- **mapping_mm:** `n/a`
- **visual_diff:** Incorpora arte en gel sutil (ej. francesa fina o baby boomer) conservando la estructura limpia y natural sobre el lecho ungueal.

```text
Perform a photorealistic edit applying a Soft Salon Gel Nail Art Design onto the client's hands. Align soft gel extensions or overlay precisely onto natural nail beds with smooth cuticle transition. Apply a sophisticated soft salon design such as a delicate micro-French tip or subtle Baby Boomer gradient with glossy gel apex and realistic light highlights. Preserve 100% original hand skin texture, tone, knuckles, finger proportions, and background setup. Do not add extreme 3D charms, floating press-on stickers, messy cuticle paint, blurred fingers, or altered hand geometry. Apply elegant soft gel nail design with pristine glossy finish seamlessly integrated onto the client's natural nail beds.
```
