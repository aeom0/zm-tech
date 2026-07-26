---
name: odentalpro-dev
description: >
  Skill para ODentalPro en el monorepo zm-tech. Actívalo cuando el usuario
  mencione ODentalPro, odental, clínica dental, apps odentalpro-*, o el
  paquete @odentalpro/dental-schema. Contiene stack, rutas del monorepo,
  convenciones y punteros a docs/diseño.
---

# ODentalPro — Dev Skill

> Complementa `SKILLS.md` del monorepo y `zmtech-dev`. Lee esto antes de tocar
> `apps/odentalpro-*` o `packages/dental-schema`.

---

## Contexto

**ODentalPro** es el producto dental del portfolio ZM Tech (clínicas / gestión odontológica).

| Pieza | Path |
|-------|------|
| Web | `apps/odentalpro-web` |
| Mobile | `apps/odentalpro-mobile` |
| Server | `apps/odentalpro-server` |
| Schema | `packages/dental-schema` → `@odentalpro/dental-schema` |
| Docs / diseño | `docs/odentalpro/` (incl. `.pen` en `docs/odentalpro/design/`) |

---

## Comandos

```bash
pnpm dev:odental:web
pnpm dev:odental:mobile
pnpm build:odental
```

---

## Convenciones

- TypeScript estricto; nombres de negocio en español.
- UI en español LATAM; iconos Lucide en web.
- Schema dental en `@odentalpro/dental-schema` — no mezclar con `@geemastudio/shared-schema`.
- Diseños Pencil/pen: `docs/odentalpro/design/*.pen` + skill `pen-design` cuando aplique.

---

## Relación con GeemaStudio

ODentalPro es producto **aparte**. No reutilizar presupuestos de tenant beauty (`tenant-config`) ni tablas de salón. Si hace falta patrón multi-tenant, documentarlo en este skill o en `docs/odentalpro/`.
