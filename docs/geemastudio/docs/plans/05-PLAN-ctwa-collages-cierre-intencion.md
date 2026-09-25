# Plan 05 — CTWA, collages y cierre por intención

> **Ubicación canónica consolidada:** Plan 05. El archivo de origen se conserva temporalmente como referencia legacy.


> Documento de contexto técnico para Cursor / Claude Code. Léelo completo antes de tocar creativos CMS, `dispatcher.ts` o el PASO 1 de Haiku. Unifica el chat con Gemini (psicología CTWA + listas), el análisis WABA **25-ago** y el anti-patrón Bu …0782 (cat-eye → menú Extensiones → drift a Uñas).

**Última actualización:** 2026-08-25
**Autor del plan:** Alberto Orta (Founder & CTO, ZM Tech)
**Estado general:** **Iteración post-listas** (2026-08-25) — tras tap de rubro: collage + pregunta texto (sin lista interactiva); patrón XIO Anime→Haiku.

---

## 1. Qué problema resuelve esto

1. **Tap «Otro» = dump** — 4 imgs genéricas + muro con sede.
2. **Welcome CTWA flojo** — poca invitación a tocar la lista.
3. **Anti-patrón Bu …0782** — efecto concreto → `show_category` del mismo rubro → indecisión.
4. **JNKM …0611 (post-deploy)** — «Precio» citando collage multi-look → falso “efecto concreto” (keywords del caption) → collage+CTA Baby Vol **sin ningún S/**.

---

## 2. Flujos objetivo (prod)

| Tap / caso | Comportamiento |
|---|---|
| Boilerplate CTWA | Saludo + lista Ext/Lift/Otro; sin imgs |
| Extensiones | Collages CMS Ext1+Ext2 + pregunta look (sin lista) |
| Lifting | Collage Lifting + pregunta pack (sin lista) |
| Uñas | Pregunta Soft Gel/PolyGel/… (sin lista) |
| Otro | Pregunta rubro en texto (sin categorías) |
| Efecto concreto + cotizó S/ | Collage + `pending_price_cta`; sin lista mismo rubro |
| «Precio» solo (+ quote collage) | No enrich quote; no Plan-04 skip sin S/; lista o montos |

Carriles Stephani/Karelis/Vanessa = internos (`WABA_CAPACITY.md`); captions **sin** nombres de chicas.

---

## 3. Código clave

| Archivo | Rol |
|---|---|
| `lib/campaign-collage.ts` | Collage por carril; `hasSpecificLashEffectIntent` (ignora quote / bare «Precio») |
| `lib/reply-context.ts` | `clientTypedPortion`, `isBarePriceAsk`, no enrich en bare price |
| `handlers/dispatcher.ts` | Copy CTWA; Otro lite |
| `lib/haiku-prompt.ts` | PASO 1: concreto → S/ + none; bare precio → montos o lista |
| `handlers/ai-assistant.ts` | Skip lista solo si specific **y** Haiku ya puso `S/…` |

Assets: Storage `waba-images/campanas/collage-*.jpeg` → `waba_config` (no JPEG en git).

---

## 4. DoD / QA

- [x] Collages Ext1/Ext2/Lifting en CMS prod
- [x] Otro lite; saludo invita a tocar lista
- [x] Captions sin nombres de chicas; sin JPEG en repo
- [x] `:ctwa-interest` 8/8 + cleanup
- [x] Fix «Precio»+quote (JNKM): no falso specific; no CTA sin montos
- [ ] Caso QA automatizado Bu/cat-eye (opcional; smoke manual OK)

```bash
yarn waba:validate:ctwa-interest
yarn waba:cleanup:qa
```

---

## 5. Docs (reorg)

Canónicos: `docs/plans/`, `docs/waba/`, `docs/ops/`, `docs/product/`. **Sin stubs** en raíz de `docs/`. Rutina: `docs/waba/prompts/rutina-waba-analysis.md` → `docs/waba/analysis/`.

---

## 6. Fuera de Plan 04

Identidad/boleta Jhoa; `chat-quality-review` FP; creativos Ads Manager; garantía; 15 % vs pack Manos+Pies.
