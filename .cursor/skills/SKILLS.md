# SKILLS.md — zm-tech (monorepo)

> Guía de entrada para Claude Code y Cursor · Actualizado: julio 2026
>
> **Sync**: fuente de verdad en `.cursor/skills/`. Claude Code usa el mismo árbol vía symlink `.claude/skills` → `../.cursor/skills`. Editar en cualquiera de las dos rutas es editar el mismo archivo.

---

## 1. Qué es este repo

**zm-tech** es el monorepo de **ZM Tech** (Alberto). Agrupa productos y la landing corporativa bajo pnpm + Turborepo.

| Producto            | Apps                                                          | Paquetes                                              |
| ------------------- | ------------------------------------------------------------- | ----------------------------------------------------- |
| **Landing ZM Tech** | `apps/landing`                                                | —                                                     |
| **GeemaStudio**     | `geemastudio-mobile`, `geemastudio-web`, `geemastudio-server` | `@geemastudio/shared-schema`, `@zmtech/tenant-config` |
| **ODentalPro**      | `odentalpro-mobile`, `odentalpro-web`, `odentalpro-server`    | `@odentalpro/dental-schema`                           |
| **RepMAX**          | `repmax-web`, `repmax-mobile`                                 | `@repmax/repmax-schema`                               |

Docs de referencia (no son fuente de skills): `docs/geemastudio/`, `docs/landing/`, `docs/odentalpro/`, `docs/repmax/`.  
**Varias BDs en un monorepo** — mapa obligatorio: [`docs/SUPABASE.md`](../../docs/SUPABASE.md).

---

## 2. Stack del monorepo

```
Package manager   pnpm 11 (workspaces)
Build             Turborepo 2.x
TypeScript        ~6.0.3 (override en raíz)
Node              22+
```

| App                  | Stack típico                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| `landing`            | Next.js 16, Tailwind v4, Framer Motion                                                                  |
| `geemastudio-web`    | Next.js 15, Tailwind, Supabase                                                                          |
| `geemastudio-mobile` | Expo / React Native, Supabase, TanStack Query v5                                                        |
| `geemastudio-server` | **Ops/DB** — Drizzle, seeds, Edge Functions (proyecto `udelxwwnyivknslueerr`). No API de negocio.       |
| `odentalpro-*`       | Web/mobile + hub ops `odentalpro-server` (migraciones `odental_*` en hub ZMTech)                        |
| `repmax-*`           | Web/mobile + `@repmax/repmax-schema` (Supabase directo; SQL en `docs/repmax/supabase/`; sin `*-server`) |

---

## 3. Comandos raíz

```bash
pnpm install
pnpm dev:landing          # landing
pnpm dev:web              # geemastudio-web
pnpm dev:mobile           # geemastudio-mobile
pnpm dev:odental:web      # odentalpro-web
pnpm dev:repmax:web       # repmax-web (:3003)
pnpm dev:repmax:mobile    # repmax-mobile
pnpm build
pnpm lint
pnpm check:types
pnpm db:push              # Drizzle push (geemastudio-server)
```

---

## 4. Mapa de skills (este directorio)

### Conocimiento / producto

| Ruta                       | Cuándo usarla                                              |
| -------------------------- | ---------------------------------------------------------- |
| `SKILLS.md` (este archivo) | Entrada al monorepo                                        |
| `geemastudio.md`           | Todo trabajo en GeemaStudio (stack, BD, gotchas)           |
| `zmtech-dev/`              | Perfil ZM Tech, ecosistema de repos, convenciones globales |
| `guataparo-dev/`           | Cliente Guataparo BR (otro repo; contexto comercial)       |
| `odentalpro-dev/`          | Trabajo en apps/packages ODentalPro                        |

### Diseño / UI

| Ruta                    | Cuándo usarla                                        |
| ----------------------- | ---------------------------------------------------- |
| `pen-design/`           | Diseños con pen.dev CLI                              |
| `brand/`                | Identidad, voz, assets                               |
| `design-system/`        | Tokens y specs                                       |
| `ui-styling/`           | Tailwind / shadcn / theming                          |
| `ui-ux-pro-max/`        | Inteligencia UI/UX multi-stack                       |
| `design/`               | Router de diseño (logo, CIP, slides, banners, fotos) |
| `slides/`               | Presentaciones HTML                                  |
| `banner-design/`        | Banners y formatos ads                               |
| `social-media-organic/` | Contenido orgánico IG/FB/TikTok                      |

### Integraciones

| Ruta                     | Cuándo usarla                        |
| ------------------------ | ------------------------------------ |
| `whatsapp-business-api/` | WABA Cloud API / bot / webhooks Deno |
| `meta-ads-manager/`      | Meta Ads / CTWA vía MCP              |

---

## 5. Sync Cursor ↔ Claude

```
.cursor/skills/     ← fuente de verdad (git)
.claude/skills      → symlink a ../.cursor/skills
```

Tras clone fresco (si el symlink no existe):

```bash
rm -rf .claude/skills && ln -s ../.cursor/skills .claude/skills
```

`docs/` guarda documentación de producto. Skills y rules **solo** en `.cursor/` (Claude: symlink).

---

## 6. Reglas rápidas

1. Leer **este archivo** + el skill del producto (`geemastudio.md`, `odentalpro-dev`, `zmtech-dev`) antes de tocar código.
2. TypeScript estricto; nombres de negocio en español; UI en español LATAM.
3. No crear `.md` de docs sin pedirlo.
4. GeemaStudio: detalle profundo en `geemastudio.md` (no duplicar aquí).
5. Supabase ZM Lash (`udelxwwnyivknslueerr`) = referencia; no modificar desde este monorepo salvo instrucción explícita.

---

_Punto de entrada para cualquier IA trabajando en zm-tech._
