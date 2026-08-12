# Catálogo + MercadoLibre — spec UX

Canvas: [`catalog.pen`](./catalog.pen) · reglas foto: [`ml-fotos.md`](./ml-fotos.md) · plan: [`../plans/04-PLAN-catalogo-mercadolibre.md`](../plans/04-PLAN-catalogo-mercadolibre.md).

Tokens: mismos que onboarding (`design-system/tokens.md`). Dark first. Sin emojis. Copy VE.

## Pantallas (mobile 390)

| Name en Pencil | Rol |
|----------------|-----|
| `Catalog / List / Disconnected / iPhone` | Stock + card **Conectar MercadoLibre** |
| `Catalog / List / Connected / iPhone` | Card activo + badges En ML / Pendiente |
| `Catalog / Product / Form / iPhone` | Nueva pieza: slots foto → ficha → switch publicar |
| `Catalog / Photos / Capture / iPhone` | Visor 1:1 + reglas + obturador / galería |
| `Catalog / Photos / ReviewPass / iPhone` | Checks OK → Usar esta foto |
| `Catalog / Photos / ReviewFail / iPhone` | Banner error → Tomar otra vez (no sube) |
| `Catalog / Publish / Blocked / iPhone` | Sheet si el switch ML se prende incompleto |

Componentes reutilizables: `MercadoLibreLogo`, `MlConnectCard*` (off / on / gate Pro), `PhotoSlotGrid`.

## Flujo captura (implementado)

```
Form slot tap → PhotoCapture → (cámara | galería, crop 1:1)
  → PhotoReview
      OK  → resize 1200 → merge pendingPhoto en Form
      FAIL → replace Capture (nada a Storage)
Form Guardar → upload URIs locales → repmax_products.photos[]
```

Switch **Publicar en MercadoLibre:** si faltan portada, n. parte o título → alert de huecos. No hay OAuth todavía.

## Copy canónico

- Captura: “Centra la pieza · ~95% del recuadro”
- Fail: “ML no va a aceptar esta foto” + qué hacer
- Sheet: “Falta un poco para publicar” / CTA “Completar ficha”
- Disclaimer revisión: no detectamos logos solos; el usuario confirma

## Fotos en catálogo (independiente de ML)

`repmax_products.photos[]` es la fuente: seed (`picsum.photos/seed/...`) o Storage. Se muestran aunque el ítem no esté en MercadoLibre.

| Superficie | Qué se ve |
|------------|-----------|
| Stock (lista) | Miniatura 56² a la izquierda; placeholder cubo si no hay portada |
| Stock (tablet grid) | Portada 1:1 arriba de la card |
| POS / carrito | Misma miniatura (`ProductThumb`) |
| Ficha | Slots (hasta 6); label “Fotos de la pieza” |

Código: `uriPortada()` + `ProductThumb` (`expo-image`).

## Paridad código

| Diseño | Código |
|--------|--------|
| ProductThumb | `apps/repmax-mobile/src/components/inventory/ProductThumb.tsx` |
| PhotoSlotGrid | `apps/repmax-mobile/src/components/inventory/PhotoSlotGrid.tsx` |
| Capture / Review | `screens/inventory/PhotoCaptureScreen.tsx`, `PhotoReviewScreen.tsx` |
| Card conectar | Pendiente (settings solo tiene hint de plan Pro) |
