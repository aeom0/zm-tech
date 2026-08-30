# Sincronización — docs/plans/geema-migration

Esta carpeta existe en **dos repos** con el mismo contenido. Solo una copia es canónica; la otra es espejo.

---

## Paths

| Rol | Repo | Path absoluto (WSL) |
|-----|------|---------------------|
| **Canónica** | ZM Lash & Nails | `/home/alber/ZM-Lash-and-Nails-Beauty/docs/plans/geema-migration/` |
| **Espejo** | zm-tech (GeemaStudio) | `/home/alber/zm-tech/docs/geemastudio/docs/plans/geema-migration/` |

---

## Regla de oro

1. **Editar siempre en la canónica (ZM)** salvo que estés en una rama de `zm-tech` que solo toca docs Geema — en ese caso edita el espejo y haz `pull` a ZM antes del merge.
2. Tras editar, ejecutar sync **antes de commitear** en el repo donde no editaste.
3. **Un solo PR por tanda de cambios de docs** si tocas ambos repos el mismo día — o commitear en ambos con el mismo mensaje y referencia cruzada.

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

Todos los archivos `*.md` en esta carpeta, incluido este `SYNC.md`. No sincroniza otros planes (`02-PLAN-*.md` siguen con su propio espejo manual o copy-paste).

---

## CI de sync (ticket S2-7)

**No es opcional “algún día”.** Está en el roadmap Sprint 2 como tarea **S2-7** ([04-ROADMAP-SPRINTS.md](./04-ROADMAP-SPRINTS.md)):

- Job en CI (ZM o `zm-tech`) que ejecute `scripts/sync-geema-migration-docs.sh diff` y **falle** si hay divergencia.
- Hasta que S2-7 esté mergeado: disciplina manual + `yarn sync:geema-migration-docs` antes de cada PR que toque esta carpeta.

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
