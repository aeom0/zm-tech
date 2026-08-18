# Guía — fotos MercadoLibre en RepMAX

Reglas que **sí validamos en app** vs las que son checklist humano / API futura.

Fuente oficial: [Trabajar con imágenes](https://developers.mercadolibre.com.ve/es_ar/trabajar-con-imagenes) (act. 2026-03-24). Autopartes: compatibilidad y atributos por categoría (`BRAND`, `PART_NUMBER`, `COLOR`, …).

Código: `apps/repmax-mobile/src/utils/mlPhotoRules.ts`.

## Técnica (bloquea Guardar / Usar foto)

| Regla ML                   | En RepMAX                                             |
| -------------------------- | ----------------------------------------------------- |
| JPG / JPEG / PNG           | `mimeType` jpeg o png                                 |
| Mín. 500×500 px            | `min(width,height) >= 500` → si no, ReviewFail        |
| Ideal 1200×1200; máx. 1920 | Resize a 1200² JPEG q=0.85 (`expo-image-manipulator`) |
| Máx. 10 MB                 | **5 MB** — techo del bucket `repmax-products`         |
| RGB (no CMYK)              | Asumido en captura móvil                              |

Storage path: `{store_id}/drafts/{ts}-{rand}.jpg`. Policy: primer folder = `store_id` del miembro.

## Composición (coach en UI, no detector)

ML pausa por `poor_quality_thumbnail` / WATERMARK / MULTIPLE. En captura mostramos:

- Pieza ~95% del recuadro; no tocar bordes
- Fondo claro y liso; no el taller
- Una sola pieza
- Sin logo, texto, WhatsApp, marco, QR
- Fotos propias (no catálogo ajeno)

No hay OCR. El disclaimer en Review lo dice. Fase C: API de diagnóstico de imágenes ML.

En **mobile** la portada (`photos[0]`) se muestra en inventario, POS y carrito aunque el producto no esté en MercadoLibre. El seed demo usa `https://picsum.photos/seed/...`.

## Slots (máx. 6)

Orden = orden de `pictures[]` al publicar:

1. **Portada** (obligatoria para el switch ML)
2. Número de parte / etiqueta
3. Ángulo 2
4. Caja / empaque
5. Detalle
6. Extra

## Ficha (hints en el form)

| Campo RepMAX    | Atributo / regla ML                                                 |
| --------------- | ------------------------------------------------------------------- |
| Título          | Producto + Marca + “compatible con” + vehículo. Sin stock ni precio |
| Número de parte | `PART_NUMBER` / OEM                                                 |
| Marca           | `BRAND` (de la pieza, no siempre la del auto)                       |
| Modelo / años   | Compatibilidad autopartes                                           |
| Descripción     | Sin teléfono, WhatsApp ni URL                                       |
| Color           | `COLOR` — **aún no hay columna** en `repmax_products`               |

## No hacer

- Subir la toma fallida “por si acaso”
- Mentir “sin logo detectado” sin API
- Publicar ítem ML desde el switch (fase C)
- Usar el logo “M” inventado — el mark oficial está en `public/brands/mercadolibre.svg`
