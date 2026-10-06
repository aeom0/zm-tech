# Banco de referencias — Look Preview (generador)

Fotos de **estilo** para Vertex Gemini Image. **No** son el portafolio WABA/CTWA (`waba-images/portfolio/`).

| Concepto | Dónde | Uso |
|----------|-------|-----|
| **Ref-bank (este dir)** | Local + Storage `waba-images/look-preview-refs/` | Imagen (2) del try-on: patrón, densidad, ritmo |
| **Portafolio WABA** | `waba-images/portfolio/…` | Campañas, panel, collage Haiku |
| **Selfies de prueba** | `fixtures/selfies/` (gitignored) | Solo QA local — no commitear |

## Layout

```
ref-bank/
  manifest.json          # style_key → archivo local + URL pública
  anime/anime-ref1.jpg   # GO Anime 06-sep (espigas + largo wearable)
```

## Storage (prod)

Prefijo público:

`https://udelxwwnyivknslueerr.supabase.co/storage/v1/object/public/waba-images/look-preview-refs/`

Subir una ref nueva:

```bash
SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) \
  supabase storage cp scripts/look-preview/ref-bank/<estilo>/<archivo>.jpg \
  ss:///waba-images/look-preview-refs/<estilo>/<archivo>.jpg \
  --experimental --project-ref udelxwwnyivknslueerr
```

Luego actualizar `manifest.json` y `portfolio_image_url` del `style_key` en `styles-seed-v1.json` (y SQL de `look_preview_styles` cuando se re-seedea prod).

## Smoke local

```bash
yarn look-preview:vertex scripts/look-preview/fixtures/selfies/avril-selfie.jpg anime \
  --ref=scripts/look-preview/ref-bank/anime/anime-ref1.jpg
```

Sin `--ref=`, el smoke descarga la URL del seed (ya apunta al ref-bank para Anime).

## Criterios para agregar una ref

1. Largo/densidad **wearable de salón** (no glam Instagram).
2. Patrón del estilo legible (p. ej. spikes Anime aislados).
3. Preferir encuadre de ojos/cejas con algo de contexto facial; crops extremos sin ceja pueden degradar identidad.
4. Una ref canónica por `style_key` en el manifest; variantes A/B van con sufijo (`-alt`, `-v2`) y no sustituyen la canónica hasta QA visual.
