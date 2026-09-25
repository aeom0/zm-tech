# 09 — Track C: reconcile `whatsapp-webhook` prod

**Fecha:** 2026-09-22  
**Estado:** ✅ cerrado — no hay drift de código entre prod y repo ZM  
**Proyecto:** `udelxwwnyivknslueerr`

---

## Veredicto

| Hecho | Valor |
|-------|--------|
| Edge en prod | `whatsapp-webhook` **v655** · `ACTIVE` · `verify_jwt=false` |
| Origen del bundle | Repo **`ZM-Lash-and-Nails-Beauty`** (path GH Actions en `entrypoint_path`) |
| Commit desplegado | `010b240f` — PR #141 (CI `ota-production.yml` 2026-09-22 ≈ 00:53 UTC) |
| Mirror en repo | `supabase/functions/whatsapp-webhook/**` en `main` ZM = fuentes del deploy |
| Canónico bot | **Solo ZM** (Opción A). Geema = panel; **no** desplegar ni apuntar Meta al EF de Geema |

El aviso de Geema CHANGELOG (22-sep) de que v655 “no tenía código en ningún repo” era **falso**: era el mismo árbol ZM que CI acaba de desplegar.

---

## Método

1. Management API / MCP `get_edge_function(whatsapp-webhook)` → metadata + lista de fuentes (80 paths: 76 webhook + 4 `_shared`).
2. `GET …/functions/whatsapp-webhook/body` → eszip ESZIP2.3 (~10 MB) — confirma módulos alcanzables desde `index.ts`.
3. Diff SHA-256 archivo a archivo vs `ZM/supabase/functions/whatsapp-webhook` + `_shared` usados.

### Resultado del diff

- **0** diferencias de contenido en todos los paths comunes.
- En el árbol ZM pero **fuera del eszip del webhook** (esperado):
  - `handlers/staff-resume.ts` — lo consume **`waba-staff-session`**, no el grafo de `whatsapp-webhook/index.ts`.
  - `lib/*.test.ts` — no se despliegan.
- `handlers/dispatch/runtime.ts` está en el eszip (importado por dispatcher); la lista MCP de “files” a veces lo omite — el body eszip es la fuente de verdad del bundle.

CLI `supabase functions download` en esta versión de CLI **no** acepta `--output`; usar MCP/`/body` + diff local.

---

## Reglas operativas (post-Track C)

1. **Editar / redeploy bot** solo desde repo ZM + `yarn deploy:whatsapp-webhook` o CI `ota-production.yml`.
2. **No** copiar ni mantener un `whatsapp-webhook` paralelo en `zm-tech` / GeemaStudio.
3. Webhook Meta (número ZM) → URL Supabase del proyecto compartido → función **ZM** `whatsapp-webhook`.
4. Retail bot (`add_to_cart` productos): ya **no** está bloqueado por drift; sigue pausado por producto (kit = texto Haiku, sin flujo retail en bot) — ver [08](./08-PLAN-retail-productos.md).

---

## Siguiente

- **Push FCM Geema** — Plan 13 Fase X / PR-09: **P0 + P8 + P9 + P10 + P18–P20 ✅** (smoke físico 23-sep: waba_chat diseño/error + appointment_reference→Agenda; ajustes de assets en curso). Checklist en `13-PLAN-panel-parity-zm-lash.md`.
- Track B / S4: crons tenant-aware antes del 2.º tenant.
- Si se toca bot retail: rama+PR en ZM, QA, deploy; sin redeploy “a ciegas” desde Geema.
