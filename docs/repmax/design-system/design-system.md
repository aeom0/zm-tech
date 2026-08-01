# RepMAX — Design System overview

**Producto:** SaaS B2B autopartes (VE / LATAM)  
**Estética:** Industrial Dark (naranja eléctrico + carbón)  
**Owner:** Alberto / ZM Tech  
**Actualizado:** 2026-08-01

## Stack UI

| Superficie | Stack |
|------------|-------|
| Mobile | Expo 56 · React Native · Inter · Lucide / MCI |
| Web panel / vitrina | Next.js 16 · Tailwind · shadcn-like patterns |
| Diseño | Pencil (`.pen`) · prototipo HTML |

## Fuentes de verdad

| Capa | Path |
|------|------|
| Tokens + pantallas onboarding | `docs/repmax/design/onboarding.pen` |
| Tokens código mobile | `apps/repmax-mobile/src/utils/theme.ts` |
| Spec UX onboarding | `docs/repmax/design/onboarding-ux-spec.md` |
| Prototipo tap-through | `docs/repmax/design/prototype/index.html` |
| Este sistema | `docs/repmax/design-system/` |

No hay `.lib.pen` separado todavía: los componentes reutilizables viven **dentro** de `onboarding.pen` (`ProgressBar`, `SelectionCard`, `ButtonPrimary`, etc.). Cuando crezcan pantallas web/dashboard, extraer a `repmax.lib.pen`.

## Brand rápido

- **Marca:** RepMAX · Business Suite
- **Acento:** naranja `#FF6B00` (dark) / `#E85C00` (light)
- **Fondo dark:** `#0D0D0D`
- **Voz:** español VE, directo, sin marketing fluff
- **Temas de tenant (identidad visual):** Turbo `#CC0000` · Acero `#1E5EFF` · Terreno `#4A5C3A` (solo color de marca; chrome del sistema sigue Industrial)

## Iconografía

- Preferir **Lucide** en diseño Pencil y web
- Mobile onboarding existente usa **MaterialCommunityIcons** — al cablear high-fi, unificar a Lucide donde sea práctico
- Tamaños: 18 / 20 / 28 en cards; hit target ≥ 44

## Breakpoints / artboards

| Target | Frame |
|--------|-------|
| Mobile | 390 × 844 |
| Gutter contenido | 20 |
| Progress onboarding | 5 segmentos |

## Anti-patterns

- Emojis Unicode en UI (incl. banderas) — usar badges de código (`VE`, `CO`)
- Gradientes púrpura / glow neón genéricos
- Cards anidadas
- Inter como “firma AI” está **aceptado** aquí (ya está en producto); no cambiar tipografía sin decisión explícita
