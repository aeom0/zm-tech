# Plan 08 — Modularización del dispatcher WABA

> **Ubicación canónica consolidada:** Plan 08. El archivo de origen se conserva temporalmente como referencia legacy.


> Extraer el waterfall de [`handlers/dispatcher.ts`](../../supabase/functions/whatsapp-webhook/handlers/dispatcher.ts) a módulos por flujo **sin cambiar el orden de los `if`**. No es un router nuevo ni cutover a Haiku.

**Última actualización:** 2026-09-17  
**Estado:** Fase 1 **merged** (PR [#131](https://github.com/aeom0/ZM-Lash-and-Nails-Beauty/pull/131); helpers + CTWA + taps de menú; `dispatcher.ts` ~2500 líneas). **Prueba real B4 / Edgar …2122 pendiente** (no bloquea merges posteriores de fixes en la misma rama de producto).

Relacionado: [`plan-haiku-primero-informativo.md`](../waba/plan-haiku-primero-informativo.md) (Batches 1–4: Haiku antes de boilerplate en gates 🟡/🟢). Este plan **no** reabre no-cutover; 🔴 pago / cita / identidad siguen determinísticos.

## Problema

Un solo archivo (~5000 líneas) concentra entrada, CTWA, steps, agenda, catálogo y catch-all Haiku. Cada fix toca el mismo waterfall y el riesgo de regresiones sube. El orden de los bloques **es** el producto (Star ubicación, CTWA stale, boleta, etc.).

## Destino

`dispatcher.ts` solo arma un `DispatchRuntime` mutable y llama `tryHandleX(rt): Promise<boolean>`. Si `true`, ya respondió y hace `return`. Nada de copy ni regex de negocio en el orquestador.

Punto de entrada sin cambios: `index.ts` y el simulador importan `dispatch` desde `handlers/dispatcher.ts`. Ese archivo reexporta `DispatchContext` y matchers públicos.

## Qué no se hace

- Reordenar el waterfall.
- Borrar fallbacks estáticos de Batches 1–3 (son respaldo si Haiku falla/timeout).
- Mover 🔴 creación/edición de cita, identidad o pago a Haiku.
- Mezclar con PR de ocupación/ticks (Yelitza).

## Fases

### Fase 1 — este PR (~2500–2800 líneas en `dispatcher.ts`)

Carpeta [`handlers/dispatch/`](../../supabase/functions/whatsapp-webhook/handlers/dispatch/):

| Módulo               | Qué sale de `dispatcher.ts`                                                            |
| -------------------- | -------------------------------------------------------------------------------------- |
| `runtime.ts`         | `DispatchContext` + `DispatchRuntime` (sesión mutable, senders, CMS)                   |
| `haiku-handoff.ts`   | `tryHandOffUnrecognizedToHaiku`, `tryHaikuFirstUnlessMostly`, `handleLocationQuestion` |
| `cart-booking.ts`    | carrito → calendario, tap catálogo stale, CTA precio post-foto                         |
| `closing-intents.ts` | tardanza, cierre natural, prompt pendiente                                             |
| `campaign-images.ts` | creativos CTWA                                                                         |
| `menu-ids.ts`        | `MENU_MAIN_OPTIONS`, `CART_NAV_IDS`, ecos Meta                                         |
| `anti-spam.ts`       | bloqueados + patrones operador / auto-reply WA Business                                |
| `ctwa.ts`            | step interés CTWA, lista stale, entrada Meta Ads                                       |
| `menu-taps.ts`       | IDs menú / packs / promos / ubicación / `CAT_` / carrito                               |

Orden del orquestador (igual que hoy): anti-spam → sombra → steps → CTWA → cancel/reclamo/P0/Mi cita → `awaiting_datetime` → menu taps → tardanza/cierre/catch-all browsing.

### Fase 2

Gates de step: `completed`, identidad, pago, no-show, curso, terceros.

### Fase 3

Bloque `awaiting_datetime` (calendario mid-agenda, Haiku Batch 1–3 ahí).

### Fase 4

Browsing + tardanza + catch-all Haiku Batch 4. Orquestador ~400–700 líneas.

## Contrato de handlers

```ts
async function tryHandleX(rt: DispatchRuntime): Promise<boolean>;
```

`true` = el turno ya se respondió (equivalente a `return` en el waterfall actual). Los handlers actualizan `rt.session` tras `getSession`.

## QA

- `deno check` del webhook.
- Units: `yarn waba:validate:menu-remap`, `:quick-wins`, gates de `:haiku-first-informational`.
- El grep de `waba-validate-fallback-932.mjs` exige el atajo de cierre **en** `dispatcher.ts` hasta Fase 4 (call site se queda en el orquestador).
- Tras e2e contra webhook: `yarn waba:cleanup:qa`.
