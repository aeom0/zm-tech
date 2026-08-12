# Design System — RepMAX

Sistema visual **Industrial Dark** para web y mobile. Fuente de verdad de diseño: Canvas Pencil + este folder. Código de referencia: `apps/repmax-mobile/src/utils/theme.ts`.

## Cómo usarlo (agentes)

1. Leer este `README.md`
2. Leer `design-system.md` (stack, librería, brand)
3. Abrir solo el archivo que necesite la tarea (`tokens.md`, `components.md`, etc.)

## Archivos

| Archivo | Cuándo |
|---------|--------|
| [`design-system.md`](./design-system.md) | Siempre — overview, stack, punteros |
| [`tokens.md`](./tokens.md) | Color, espacio, tipo, radio |
| [`components.md`](./components.md) | Botones, cards, progress, toast, header |
| [`visual-style.md`](./visual-style.md) | Estética Industrial Dark, gradientes, anti-patterns |
| [`motion.md`](./motion.md) | Transiciones onboarding / UI |
| [`onboarding.md`](./onboarding.md) | Flujo de 7 pantallas + tap-through |
| [`voice.md`](./voice.md) | Copy VE, CTAs, errores |
| [`../brand/README.md`](../brand/README.md) | Logos, favicons, íconos mobile |

## Principios

1. **Decisiones, no catálogos.** Preferir “usa `$accent` para CTA” a listar 40 hex.
2. **Dark first.** Light es variante de tokens (`mode: light`), no un rediseño.
3. **Sin emojis en UI.** Lucide / MaterialCommunityIcons.
4. **Código alineado.** Cambios de token → actualizar `.pen` variables **y** `theme.ts`.

## Estado

| Pieza | Estado |
|-------|--------|
| Tokens Pencil (`onboarding.pen` + `catalog.pen`) | Listo (dark/light) |
| Componentes onboarding | Listo en canvas |
| Catálogo / fotos ML | Canvas + mobile fase A |
| Design system docs | v0.1 — 2026-08-01 |
| Paridad total web/dashboard | Pendiente |
