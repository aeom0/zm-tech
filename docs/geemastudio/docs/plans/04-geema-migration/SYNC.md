# Sincronización temporal — Plan 04 Geema ↔ ZM

Esta carpeta existe temporalmente en **dos repos** con el mismo contenido.
Durante la migración, ZM conserva la copia operativa de referencia y Geema
mantiene el espejo. La fuente de verdad final será GeemaStudio después del
cutover completo de ZM Lash.

---

## Paths

| Rol | Repo | Path absoluto (WSL) |
|-----|------|---------------------|
| **Canónica** | ZM Lash & Nails | `/home/alber/ZM-Lash-and-Nails-Beauty/docs/plans/geema-migration/` |
| **Espejo** | zm-tech (GeemaStudio) | `/home/alber/zm-tech/docs/geemastudio/docs/plans/geema-migration/` |

---

## Regla durante la transición

1. Los cambios de runtime WABA se documentan primero en ZM mientras las Edge
   Functions sigan desplegándose desde ese repo.
2. Los cambios de producto, panel y multi-tenancy se documentan primero en
   Geema.
3. Si el cambio afecta decisiones compartidas de migración, editar ZM y ejecutar
   sync antes de cerrar la tanda.
4. No crear aquí nuevos planes globales ni duplicar los Planes 09–15 de Geema.
5. Tras el cutover WABA, Geema será la fuente canónica y este sync se convertirá
   en registro histórico.

---

## Script

Desde la raíz de **ZM** (canónica):

```bash
# Copiar canónica → espejo Geema (caso habitual)
yarn sync:geema-migration-docs
# equivalente:
./scripts/sync-geema-migration-docs.sh push

# Traer cambios del espejo → canónica (si editaste en zm-tech)
./scripts/sync-geema-migration-docs.sh pull

# Ver diferencias sin copiar
./scripts/sync-geema-migration-docs.sh diff

# CI S2-7 — falla si canónica ≠ espejo
./scripts/sync-geema-migration-docs.sh diff-check
```

Desde la raíz de **zm-tech**:

```bash
../ZM-Lash-and-Nails-Beauty/scripts/sync-geema-migration-docs.sh push   # ZM → Geema
../ZM-Lash-and-Nails-Beauty/scripts/sync-geema-migration-docs.sh pull   # Geema → ZM
../ZM-Lash-and-Nails-Beauty/scripts/sync-geema-migration-docs.sh diff
```

---

## Qué sincroniza

Todos los archivos `*.md` en esta carpeta, incluido este `SYNC.md`. No
sincroniza los planes globales ni la serie canónica consolidada de Geema.
La copia consolidada del Plan 04 en Geema está en:
`docs/geemastudio/docs/plans/04-geema-migration/`.

Esa carpeta consolidada no debe editarse directamente mientras el sync siga
activo; se actualiza desde esta carpeta al cerrar cada tanda.

---

## CI de sync (ticket S2-7)

**No es opcional “algún día”.** Está en el roadmap Sprint 2 como tarea **S2-7** ([04-ROADMAP-SPRINTS.md](./04-ROADMAP-SPRINTS.md)):

- Job en CI (ZM o `zm-tech`) que ejecute `scripts/sync-geema-migration-docs.sh diff` y **falle** si hay divergencia.
- Hasta que S2-7 esté mergeado: disciplina manual + `yarn sync:geema-migration-docs` antes de cada PR que toque esta carpeta.
- El job debe continuar hasta que el runtime WABA, los crons y el runbook de
  operación ya estén alojados en Geema.

Implementación sugerida (S2-7):

```yaml
# Pseudocódigo — adaptar al workflow existente
- run: ./scripts/sync-geema-migration-docs.sh diff
  # exit 1 si diff -qr encuentra diferencias (ajustar script si hace falta)
```

---

## Historial de sync

| Fecha | Acción | Notas |
|-------|--------|-------|
| 2026-08-28 | Creación inicial | Análisis Cursor → Plan 05, carpetas ZM + espejo Geema |
| 2026-08-28 | Hardening roadmap | S1 ventana/no-go, S3 feature flag, S4 Vault, S2-7 CI sync |
| 2026-08-29 | S1-5 + S2 bridge + S3 WABA | Auth Hook; tenant_settings + ADR 05; PR #89 flag OFF; S5-B branding doc |
| 2026-08-29 | S5-B push FCM bosquejo | § Push FCM en 06; tareas S5B-8…12; espejo zm-tech (commit pendiente post-APK SDK 56) |
| 2026-08-29 | S5-C paridad mobile shadow | 07-PARIDAD-MOBILE-ZM.md; shadow APK OK core; gaps packs/promos/finanzas |
| 2026-08-30 | S5-C avance P0 | S5C-1/2/3/11 ✅ PR zm-tech #30; packs/promos/timezone/chicas; espejo sync |
| 2026-08-30 | Schema canónico + índices apt_svc | 07 § Schema canónico; migration `idx_appointment_services_lookup`; PR #31 no CREATE en prod |
| 2026-08-30 | País / wallclock ADR | 05 addendum: sin `countries`; citas = hora de pared del tenant |
| 2026-09-02 | Look Preview Plan 07 | Planes `06`/`07` + anexo prompts copiados a `zm-tech/.../plans/` (fuera de esta carpeta); ticket S6-LP en roadmap |
| 2026-09-21 | 08 retail productos | `08-PLAN-retail-productos.md` + README; push espejo `zm-tech` (`1794dff7`) para CI diff-check PR #140 |
| 2026-09-22 | Alineación post Plan 11 + Productos Geema | `00` semáforo, `04` S6-3/4/4b, `08` checklist parcial, README; espejo sync |
| 2026-09-22 | Historial WABA Geema (Plan 11 F5.2) | `04` S6-4b ✅; `00` Track A → Portafolio |
| 2026-09-22 | Portafolio WABA Geema (Plan 11 F5.3) | `04` S6-5 ✅; `00` → deep link / simulador |
| 2026-09-22 | Deep link Clientes→Mensajes (Plan 12 P3) | `04` S6-5b ✅; `00` → Simulador |
| 2026-09-22 | Simulador WABA Geema (Plan 11 F4) | UI + tab; reusa EF ZM; Track A panel WABA cerrado |
| 2026-09-22 | Track C webhook reconcile | `09-WEBHOOK-PROD-RECONCILE.md`; v655 = ZM `010b240f`; drift 🔴→🟢 |
| 2026-09-22 | Plan 12 P1/P2 finanzas ejecutiva Geema | Resumen+Detalle `/finanzas`; PanelShell + card Inicio |
| 2026-09-22 | Docs alineados pre–Push FCM | Plan 12 scorecard/G*; 09 siguiente → PR-09; README |
| 2026-09-22 | PR-09 P0 + P8 Push FCM | Firebase `com.geemastudio.app` + EAS + `useNotifications` persist; push físico validado; EF solo ZM; ajustes de assets en curso |
| 2026-09-23 | PR-09 P18–P20 Push P2 | `appointment_reference` → Agenda (`navigationRef` + cola cold start); `waba_chat` diseño/error; smoke físico ✅ en APK con OTA prod; EF solo ZM |
