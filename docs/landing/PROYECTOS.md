# Resumen de Proyectos — Alberto Orta (ZM Tech)

> Actualizado: 2026-07-30  
> GitHub: [aeom0](https://github.com/aeom0) · 12 repos (2 públicos, 10 privados)  
> Fuente operativa en monorepo: este archivo (`docs/landing/PROYECTOS.md`)

---

## Inventario GitHub (`aeom0`)

| Repo | Visibilidad | Tipo | Web / home | Último push |
|------|-------------|------|------------|-------------|
| [zm-tech](https://github.com/aeom0/zm-tech) | Público | Hub monorepo (Landing + GeemaStudio + OdentalPro) | [zmtechdev.com](https://zmtechdev.com) (`/es`, `/en`) | 2026-07-30 |
| [ZM-Lash-and-Nails-Beauty](https://github.com/aeom0/ZM-Lash-and-Nails-Beauty) | Privado | Cliente — salón Lima | [zmlashnails.com](https://www.zmlashnails.com/) | 2026-07-29 |
| [prolens](https://github.com/aeom0/prolens) | Privado | Tienda óptica VE | [prolens-sigma.vercel.app](https://prolens-sigma.vercel.app) | 2026-07-29 |
| [zetaeme-enterprise-suite](https://github.com/aeom0/zetaeme-enterprise-suite) | Privado | Enterprise cosméticos | [zetaeme-enterprise-suite.vercel.app](https://zetaeme-enterprise-suite.vercel.app) | 2026-07-27 |
| [geemastudio](https://github.com/aeom0/geemastudio) | Privado | Legacy SaaS beauty (origen SalonPro) | [salonpro-web-virid.vercel.app](https://salonpro-web-virid.vercel.app) | 2026-07-23 |
| [naturalforce-suite](https://github.com/aeom0/naturalforce-suite) | Privado | Cliente — suplementos PE | naturalforce100… | 2026-07-18 |
| [guataparobr](https://github.com/aeom0/guataparobr) | Privado | Cliente — inmobiliaria VE | `guataparobr.com` (pendiente) | 2026-04-29 |
| [Guataparo-demo](https://github.com/aeom0/Guataparo-demo) | Privado | Demo MVP Guataparo | Replit | 2026-04-28 |
| [condoapp](https://github.com/aeom0/condoapp) | Privado | SaaS condominios | — | 2026-04-08 |
| [yla-mvp](https://github.com/aeom0/yla-mvp) | Público | Cliente — yoga / bienestar | [yla-mvp.vercel.app](https://yla-mvp.vercel.app) | 2026-04-06 |
| [RepMAX](https://github.com/aeom0/RepMAX) | Privado | SaaS / marketplace autopartes | [torquea-app-web.vercel.app](https://torquea-app-web.vercel.app) | 2026-03-24 |
| [ia-scout360](https://github.com/aeom0/ia-scout360) | Privado | Scouting deportivo IA | [ia-scout360.vercel.app](https://ia-scout360.vercel.app) | 2026-02-01 |

**Nota:** el repo antiguo de landing `aeom0/ZMTech` quedó absorbido en `zm-tech` → `apps/landing`. El repo standalone `geemastudio` sigue en GH; el desarrollo activo del producto vive en `zm-tech`.

---

## 0. zm-tech (hub monorepo)

**Tipo**: Monorepo pnpm + Turborepo — fábrica ZM Tech  
**Estado**: Activo  
**Repo**: [aeom0/zm-tech](https://github.com/aeom0/zm-tech) (público)

### Productos dentro del monorepo

| Producto | Apps | Packages |
|----------|------|----------|
| **Landing** | `apps/landing` | `@zmtech/quote-engine` |
| **GeemaStudio** | `geemastudio-web`, `geemastudio-mobile`, `geemastudio-server` | `@geemastudio/shared-schema`, `@geemastudio/tenant-config` |
| **OdentalPro** | `odentalpro-web`, `odentalpro-mobile`, `odentalpro-server` | `@odentalpro/dental-schema` |

**Landing:** producción en [zmtechdev.com](https://zmtechdev.com) — ES `/es` (default), EN `/en`; Vercel project `zmtech`.

### Stack hub
- Node 22+, pnpm 11, Turborepo
- Next.js (web) + Expo (mobile) + Supabase + Drizzle
- Docs por producto en `docs/<producto>/`

### Path local
`/home/alber/zm-tech`

---

## 1. GeemaStudio (antes SalonPro)

**Tipo**: SaaS multi-tenant para salones de belleza en LATAM  
**Estado**: Activo — desarrollo en monorepo `zm-tech`  
**Mercado piloto**: Venezuela / LATAM  
**Origen**: ZM Lash & Nails Beauty (Lima)

### Descripción
Plataforma comercializable para salones, barberías y peluquerías. Soporte para 4 tipos de negocio: spa de uñas, barbería, salón de cabello y estética completa. Temas dinámicos (colores, moneda, terminología) por tenant.

### Stack
- **Mobile**: React Native + Expo (SDK 56 en monorepo) + React 19
- **Backend**: Supabase (PostgREST directo)
- **DB**: PostgreSQL + Drizzle ORM + Zod
- **Web**: Next.js (landing + panel `/panel`)
- **Estado**: TanStack React Query v5
- **Paleta Lunaris**: `#40E0D0` / `#00897B`

### Características clave
- Tenant config (`@geemastudio/tenant-config`) con presets por tipo
- Onboarding en 5 pasos
- Roles: `dev` | `owner` | `staff` + RLS
- Agenda, servicios, inventario, finanzas, comisiones
- Panel web de horarios / configuración

### Repositorios
- Activo: [aeom0/zm-tech](https://github.com/aeom0/zm-tech) → apps `geemastudio-*`
- Legacy: [aeom0/geemastudio](https://github.com/aeom0/geemastudio)

---

## 2. OdentalPro

**Tipo**: SaaS multi-tenant para clínicas dentales — LATAM  
**Estado**: Scaffold / construcción (apps dedicadas en `zm-tech`)  
**Repo**: dentro de [aeom0/zm-tech](https://github.com/aeom0/zm-tech)

### Descripción
Vertical dental con apps propias desde el día 0 y Supabase multi-tenant nativo (sin retrofit). Schema en `@odentalpro/dental-schema`.

### Stack
- Next.js + Expo + Supabase + Drizzle (alineado al monorepo)
- Docs: `docs/odentalpro/` (planes 01–03, design tokens)

### Path
`apps/odentalpro-{web,mobile,server}` · `packages/dental-schema`

---

## 3. ZM Lash & Nails Beauty

**Tipo**: App de gestión para salón de uñas — Lima, Perú  
**Estado**: Producción (primer cliente; mantenimiento + features)  
**Cliente**: Vanessa  
**Repo**: [aeom0/ZM-Lash-and-Nails-Beauty](https://github.com/aeom0/ZM-Lash-and-Nails-Beauty) (privado)

### Descripción
App móvil + web del salón real. Seed del producto GeemaStudio. Citas, equipo, servicios, finanzas, inventario y bot WABA.

### Stack
- React Native 0.81 + Expo SDK 54 + React 19 + Next.js 15
- Supabase `udelxwwnyivknslueerr`
- WABA bot (+51 981 444 430), Claude Haiku, FCM, EAS OTA, Sanity CMS

### Características clave
- Bot WhatsApp (reservas / recordatorios) — token WABA renovar ~abril 2026
- Asistente IA (Claude Haiku)
- Moneda: `S/` (sol peruano) · UI es-PE
- Equipo: Vanessa (owner), Stephani, Yosaida, Romina
- Roles: `dev` | `owner` | `staff`

### Path local
`/home/alber/ZM-Lash-and-Nails-Beauty`

---

## 4. ZetaEme Enterprise Suite

**Tipo**: Sistema empresarial para cosméticos — Venezuela  
**Estado**: Producción  
**Repo**: [aeom0/zetaeme-enterprise-suite](https://github.com/aeom0/zetaeme-enterprise-suite) (privado)

### Descripción
Suite empresarial (ventas, inventario, producción, compras) con cumplimiento normativo VE (SENIAT Art. 177, tasa BCV).

### Stack
- Turborepo + Yarn 4.9.4
- Next.js 15 + React 19 + RN / Expo SDK 54
- Supabase + Drizzle · 161/161 tests en paquetes compartidos

### Aplicaciones
| App | Función |
|-----|---------|
| Admin / Hub | Gestión central y reportes |
| Inventory | Control de stock e insumos |
| Production | Órdenes de producción |
| Purchases | Gestión de compras |
| Mobile Sales | App de ventas para representantes |

### Path local
`/home/alber/zetaeme-enterprise-suite`

---

## 5. RepMAX Business Suite

**Tipo**: SaaS / marketplace B2B para autopartes — Venezuela  
**Estado**: En desarrollo (último push mar 2026)  
**Repo**: [aeom0/RepMAX](https://github.com/aeom0/RepMAX) (privado)

### Descripción
Multi-tenant para tiendas de repuestos: catálogo, inventario, ventas, clientes; pagos USD / Bs. Descripción GH también habla de marketplace con verificación IA y escrow.

### Stack
- React Native + Expo SDK 54
- Next.js 15 + App Router + Tailwind
- Express.js + TypeScript + JWT
- PostgreSQL + Drizzle · Yarn 4 + Turborepo

### Características clave
- Aislamiento por tienda
- Diseño “Industrial Dark”
- Vitrina pública `/[slug]` · panel `/dashboard`
- Home: [torquea-app-web.vercel.app](https://torquea-app-web.vercel.app)

### Path local
`/home/alber/RepMAX`

---

## 6. IA Scout360

**Tipo**: Scouting deportivo con IA — béisbol, Venezuela  
**Estado**: Activo (migración Firebase → Supabase completada)  
**Repo**: [aeom0/ia-scout360](https://github.com/aeom0/ia-scout360) (privado)

### Descripción
Scouting de jugadores con escala MLB 20-80, cámara slow-mo (240 FPS) y detección de bat (YOLOv8n).

### Stack
- Yarn 4 + Turbo · Next.js 15 + React 19
- Expo SDK 54 + React Native
- Supabase · YOLOv8n

### Path local
`/home/alber/ia-scout360`

---

## 7. YLA — Yoga con Lógica y Alma

**Tipo**: Landing / MVP cliente — yoga y bienestar  
**Estado**: Landing completa → próximo PWA  
**Cliente**: Yube Karina (Venezuela)  
**Repo**: [aeom0/yla-mvp](https://github.com/aeom0/yla-mvp) (público)

### Descripción
Landing modular con filosofía de marca, programas y comunidad. Contenido desde Notion de la clienta. Estrategia web-first.

### Stack
- Next.js 15 + React 19 + Tailwind v4
- Paleta: Lavanda `#B497D6` · Beige `#F6EBD9` · Gold `#E8D3A3`
- Fuentes: Playfair Display + Lato (+ Dancing Script)

### Path local
`/home/alber/yla-mvp`

---

## 8. Guataparo Bienes Raíces

**Tipo**: Sitio + panel inmobiliario — Valencia, Venezuela  
**Estado**: Fase 0 hecha → Fase 1 (Supabase + Auth)  
**Cliente**: Morelba Hernández  
**Repos**: [aeom0/guataparobr](https://github.com/aeom0/guataparobr) · demo [aeom0/Guataparo-demo](https://github.com/aeom0/Guataparo-demo)

### Descripción
Presencia digital y gestión de propiedades. Propuesta comercial referencia: ~$435 USD (50/50) + $30/mes soporte.

### Stack
- Next.js 16 · Turborepo + pnpm · Supabase · Cloudinary · Tailwind v4
- Paleta: Negro `#1B1A1B` · Dorado `#AF8D59` · Bronce `#89715F` · Crema `#D5D0CA`
- Fuentes: Playfair Display + Montserrat

### Path local
`/home/alber/guataparobr`

---

## 9. CondoApp

**Tipo**: SaaS B2B para condominios / urbanizaciones — LATAM  
**Estado**: En desarrollo (MVP módulos definidos)  
**Repo**: [aeom0/condoapp](https://github.com/aeom0/condoapp) (privado)

### Descripción
Reemplaza WhatsApp + Excel de juntas de condominio. Panel web (admin) + mobile (residente / portero). Tenant = `condominium` (simple / multi-torre / administradora).

### Stack
- Turborepo + Yarn 4 · Next.js 15 · Expo · Express + Drizzle · Supabase + Zod

### Módulos MVP
Residentes, cuotas USD+Bs, QR acceso, comunicaciones, mantenimiento, reservas, asambleas

### Path local
`/home/alber/CondominiOS` (carpeta local; repo GH `condoapp`)

---

## 10. Natural Force Suite

**Tipo**: Ecosistema digital — suplementos naturales (Perú)  
**Estado**: Fase 1 web ✅ · Admin / inventario en progreso · WABA pendiente  
**Repo**: [aeom0/naturalforce-suite](https://github.com/aeom0/naturalforce-suite) (privado)

### Descripción
Reemplazo/extensión del Shopify actual: landing + catálogo + admin + bot WhatsApp. Design system Sage Earth. Supabase `ddfmmgddzphxidocmjba`.

### Stack
- Turborepo + Yarn 4 · Next.js 15 · Tailwind v4 · Supabase + Drizzle
- Apps: `web` (3000), `admin` (3001)
- Producción: naturalforce100suplementosnaturales.com · panel `/admin`

### Path local
`/home/alber/naturalforce-suite`

---

## 11. Prolens

**Tipo**: Tienda óptica Venezuela — Sistema 3en1 Classic  
**Estado**: Activo (checkout retail + cotización Aliado)  
**Repo**: [aeom0/prolens](https://github.com/aeom0/prolens) (privado)

### Descripción
E-commerce / cotización con checkout y pago manual; flujo Aliado asistido por WhatsApp. Dominio objetivo `myprolens.com` (DNS pendiente).

### Stack
- Next.js 15 · Tailwind v4 · TypeScript · Postgres (Docker) · Vercel
- Docs internas en `docs/` del repo · Roadmap: web → Expo → ML/Amazon

### Path local
`/home/alber/prolens`  
Preview: [prolens-sigma.vercel.app](https://prolens-sigma.vercel.app)

---

## Tabla comparativa

| Proyecto | Dominio | Mercado | Stack principal | Estado | Repo GH |
|----------|---------|---------|-----------------|--------|---------|
| **zm-tech** | Hub / landing + productos | LATAM | pnpm + Turbo + Next + Expo | Activo | `zm-tech` |
| **GeemaStudio** | SaaS Beauty | LATAM | RN + Expo + Supabase | Activo (en monorepo) | `zm-tech` / legacy `geemastudio` |
| **OdentalPro** | SaaS Dental | LATAM | Next + Expo + Supabase | Scaffold | `zm-tech` |
| **ZM Lash & Nails** | App salón | Lima, PE | RN + Expo + Supabase + WABA | Producción | `ZM-Lash-and-Nails-Beauty` |
| **ZetaEme** | Enterprise cosméticos | Venezuela | Next + RN + Supabase | Producción | `zetaeme-enterprise-suite` |
| **RepMAX** | Autopartes | Venezuela | RN + Next + Express | En desarrollo | `RepMAX` |
| **IA Scout360** | Scouting IA | Venezuela | Next + RN + Supabase | Activo | `ia-scout360` |
| **YLA-MVP** | Yoga / bienestar | Venezuela | Next.js 15 + Tailwind v4 | Landing lista | `yla-mvp` |
| **Guataparo BR** | Inmobiliaria | Valencia, VE | Next 16 + pnpm + Supabase | Fase 1 | `guataparobr` |
| **CondoApp** | Condominios | LATAM | Next + Expo + Express | En desarrollo | `condoapp` |
| **Natural Force** | Suplementos | Perú | Next + Supabase + Turbo | Fase 2–3 | `naturalforce-suite` |
| **Prolens** | Óptica / retail | Venezuela | Next 15 + Postgres | Activo | `prolens` |

---

## Cambios vs versión 2026-03-12

| Antes | Ahora |
|-------|--------|
| SalonPro como producto #1 | Renombrado / absorbido → **GeemaStudio** en `zm-tech` |
| 6 proyectos listados | **12 repos GH** + OdentalPro en monorepo |
| Paths solo locales | Paths + URLs GitHub + homes Vercel |
| Sin Guataparo, CondoApp, Natural Force, Prolens, OdentalPro, hub | Incluidos |

---

## Paths locales (WSL)

```
/home/alber/zm-tech
/home/alber/ZM-Lash-and-Nails-Beauty
/home/alber/zetaeme-enterprise-suite
/home/alber/geemastudio          # legacy
/home/alber/RepMAX
/home/alber/ia-scout360
/home/alber/yla-mvp
/home/alber/guataparobr
/home/alber/naturalforce-suite
/home/alber/prolens
/home/alber/CondominiOS          # condoapp
```

Skill paraguas del ecosistema: `.cursor/skills/zmtech-dev/SKILL.md` (symlink Claude: `.claude/skills/zmtech-dev`).
