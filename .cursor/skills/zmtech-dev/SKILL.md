---
name: zmtech-dev
description: >
  Skill paraguas de ZM Tech. Actívalo siempre que el usuario mencione ZM Tech,
  Alberto, sus proyectos, la landing, o cualquier contexto de la fábrica de software.
  Contiene el perfil completo de la empresa, TODOS los repos y proyectos activos,
  el stack por defecto y las convenciones globales.
---

# ZM Tech — Skill Maestro

> Lee este archivo antes de trabajar en CUALQUIER proyecto de ZM Tech.
> Es el contexto paraguas. Cada proyecto tiene su propio skill complementario.

---

## 🏢 Quién es ZM Tech

**ZM Tech** es una fábrica de software fundada por **Alberto**, especializada en
soluciones SaaS para LATAM. Verticales activas: Beauty, Inmobiliaria, Wellness/Yoga,
Automotriz, Sports Tech y Enterprise.

- **Landing:** `zmtechdev.com` (`/es` · `/en`)
- **Repo:** `aeom0/zm-tech` → `apps/landing` (Next.js 16, App Router, Tailwind v4)
- **Vercel:** project `zmtech`
- **Email canónico:** `alberto@zmtechdev.com` (contacto, legal, integraciones de desarrollador — Mercado Libre, etc.)
- **WhatsApp comercial:** +58 414 494 0417
- **Entorno de Alberto:** VS Code + WSL2 + Windows 11 · Android = target mobile primario
- **Inventario repos:** `docs/landing/PROYECTOS.md`
- **Mapa Supabase (varias BDs en zm-tech):** `docs/SUPABASE.md` — obligatorio antes de SQL/migraciones

---

## 🗄 Supabase en el monorepo zm-tech

| Proyecto    | Ref                    | Productos                                             |
| ----------- | ---------------------- | ----------------------------------------------------- |
| ZMTech hub  | `llacowjutjfefboqgfnj` | Landing + Odental (`odental_*`) + RepMAX (`repmax_*`) |
| GeemaStudio | `udelxwwnyivknslueerr` | Beauty SaaS (proyecto dedicado)                       |

`*-server` = ops/DB/Edge, **no** API JWT. RepMAX no tiene `repmax-server`. Detalle: `docs/SUPABASE.md`.
---

## 👤 Perfil del fundador

**Alberto** — desarrollador full-stack, diseñador de productos digitales.

- Trabaja solo o con Claude como co-desarrollador
- Mobile-first siempre (375px como viewport de referencia)
- Prefiere monorepos, TypeScript estricto, y arquitecturas escalables desde el día 1
- Modulariza todo: UI / lógica / servicios / contexto en capas separadas

---

## 🗂 Ecosistema completo de repos (aeom0)

### Clientes activos

#### 1. ZM Lash and Nails Beauty ⭐ PRIMER CLIENTE

- **Cliente:** Vanessa (hermana de Alberto)
- **Ubicación:** Lima, Perú
- **Repo:** `aeom0/ZM-Lash-and-Nails-Beauty` (privado)
- **Web:** `zmlashnails.com` (Vercel Hobby)
- **Vertical:** Beauty / salón de uñas y pestañas
- **Versión:** v2.1 · **Skill detallado:** `.claude/SKILLS.md` del repo
- **Stack:** Expo SDK 54 + React Native 0.81 + React 19 + Next.js 15 + Supabase + Drizzle ORM + Yarn + EAS
- **Supabase project:** `udelxwwnyivknslueerr`
- **Moneda:** Soles peruanos (S/) — `fmtSoles()` en `apps/mobile/utils/format.ts`
- **Idioma UI:** Español es-PE sin excepción
- **Paleta:** Violeta #7B2D8E · Violeta claro #E8D4ED · Violeta oscuro #5A1F6A · Oro #D4AF37 · Superficie #F8F5FA
- **Equipo salón:** Vanessa (owner), Stephani, Yosaida, Romina
- **Roles:** `dev` | `owner` | `staff`
- **Integraciones:** WABA bot (+51 981 444 430), Claude Haiku (bot IA, `claude-haiku-4-5-20251001`), FCM push, EAS OTA, Sanity CMS, GitHub Actions
- **⚠️ WABA token expira ~30 abril 2026** — renovar `WHATSAPP_ACCESS_TOKEN` en Supabase Secrets
- **Patrones críticos:** TanStack Query v5 (breaking vs v4), `appointments.date` en UTC → mostrar con `timeZone: "America/Lima"`, títulos WABA lista máx 24 chars (`LIST_TITLE_MAX`), NO hay Express (directo a Supabase), `whatsapp-webhook` deploy siempre con `--no-verify-jwt`
- **Estado:** En producción ✅

#### 2. Guataparo Bienes Raíces

- **Cliente:** Morelba Hernández — Valencia, Venezuela
- **Repo:** `aeom0/guataparobr` (privado)
- **Skill:** `.cursor/skills/guataparo-dev/SKILL.md` (monorepo zm-tech; repo del cliente: `aeom0/guataparobr`)
- **Stack:** Next.js 16.2, Turborepo + pnpm, Supabase, Cloudinary, Tailwind v4
- **Paleta:** Negro #1B1A1B · Dorado #AF8D59 · Bronce #89715F · Crema #D5D0CA · Carbón #4D4E49 · Perla #CECFCA · Marfil #F1F2ED
- **Fuentes:** Playfair Display (titulares) + Montserrat (cuerpo/UI)
- **Propuesta:** $435 USD (50/50) + $30/mes soporte
- **Estado:** Fase 0 ✅ → Fase 1 en progreso (Supabase + Auth)
- **Deploy:** Vercel → `guataparobr.com` (pendiente)
- **Repo demo:** `aeom0/Guataparo-demo` (privado)

#### 3. YLA — Yoga con Lógica y Alma

- **Cliente:** Yube Karina
- **Repo:** `aeom0/yla-mvp` (público)
- **Skill:** `/mnt/skills/user/yla-dev/SKILL.md`
- **Stack:** Next.js 15, React 19, Tailwind v4, Supabase+Stripe (Fase 2)
- **Paleta:** Lavanda #B497D6 · Beige #F6EBD9 · Gold #E8D3A3 · Carbón #333333
- **Fuentes:** Playfair Display + Lato + Dancing Script
- **Estado:** Landing 100% completa → próximo Fase 1 PWA

### Productos propios ZM Tech

#### 4. GeemaStudio

- **Repo monorepo:** `zm-tech` → apps `geemastudio-mobile` / `geemastudio-web` / `geemastudio-server`
- **Skill detallado:** `.cursor/skills/geemastudio.md` (symlink Claude: `.claude/skills/geemastudio.md`)
- **Descripción:** SaaS multi-tenant para salones de belleza, barberías y spas en LATAM
- **Basado en:** ZM Lash & Nails Beauty (primer cliente = seed del producto)
- **Stack:** Expo SDK 56 + RN 0.85 + Next.js 15 + Supabase + Drizzle + pnpm/Turborepo
- **Tipos de negocio:** spa-nails, barbershop, hair-salon, full-aesthetic
- **Features:** Agenda, Inventario, Finanzas, WABA, panel web `/panel`
- **Packages:** `@geemastudio/shared-schema`, `@zmtech/tenant-config`
- **Paleta Lunaris:** `#40E0D0` / `#00897B`
- **Estado:** activo en monorepo zm-tech

#### 5. RepMAX Business Suite

- **Ubicación:** monorepo `zm-tech` → `apps/repmax-web`, `apps/repmax-mobile`, `packages/repmax-schema`
- **Docs:** `docs/repmax/`
- **Descripción:** SaaS B2B multi-tenant para tiendas de autopartes en Venezuela
- **Stack:** Expo SDK 56 + Next.js 16 + Supabase Auth/RLS (`repmax_*`) + Drizzle schema package
- **Features:** Inventario, POS mobile, vitrina `/{slug}` y `{slug}.zmtechdev.com`, panel `/dashboard`
- **Estado:** Integrado en zm-tech (sin Express; repo standalone `aeom0/RepMAX` legacy)
- **Supabase:** proyecto compartido ZMTech `llacowjutjfefboqgfnj`

#### 6. CondoApp

- **Repo:** `aeom0/condoapp` (privado)
- **Descripción:** SaaS B2B para gestión de condominios y urbanizaciones en LATAM
- **Stack:** Next.js 15 + Expo + Express + Drizzle ORM + Supabase + Zod + Turborepo + Yarn 4
- **Modelo:** Multi-tenant — tenant = condominium (simple / multi-torre / administradora)
- **Módulos:** Residentes, Cuotas USD+Bs., QR acceso, Comunicaciones, Mantenimiento, Reservas, Asambleas
- **Estado:** En desarrollo

#### 7. IA Scout360

- **Repo:** `aeom0/ia-scout360` (privado)
- **Descripción:** Plataforma de scouting deportivo con análisis IA
- **Stack:** Next.js 15 + React 19 + Expo SDK 54 + React Native 0.81.5 + Supabase + Yarn 4 + Turborepo
- **Usuarios:** Scouts, entrenadores, academias deportivas
- **Estado:** Migración Firebase → Supabase completada ✅

#### 8. ZetaEme Enterprise Suite

- **Repo:** `aeom0/zetaeme-enterprise-suite` (privado)
- **Descripción:** Sistema empresarial para cosméticos en Venezuela (ventas, inventario, producción, compras)
- **Stack:** Next.js 15.5.7 + React 19.2.1 + RN 0.81.5 + Expo SDK 54 + Supabase + Turborepo + Yarn 4.9.4
- **Apps:** admin-panel, inventory-panel, production-panel, purchases-panel, mobile-sales
- **Dominios:** `admin.zetaemecosmeticos.com`, `inventario.`, `compras.`, `central.`
- **Features:** Offline Sync v2, OTA Updates, FEFO, BOM, Art. 177 SENIAT, 161/161 tests ✅
- **Versión:** 2.23.1 · **Estado:** En producción ✅

#### 9. Hub ZM Tech (interno)

- **Ubicación:** monorepo `zm-tech` → `apps/hub` + `packages/hub-schema` (planificados)
- **Docs:** `docs/hub/` (README, ROADMAP, planes 01–05, migraciones borrador)
- **Descripción:** Torre de control interna de la fábrica — clientes, proyectos, contratos, leads del cotizador, tickets, recordatorios, comunicaciones
- **Stack:** Next.js 16 + Tailwind v4 + Supabase (hub `llacowjutjfefboqgfnj`, prefijo `hub_`) — sin server, patrón RepMAX
- **Estado:** Documentación cerrada (ago 2026) — desarrollo no iniciado

---

## 🛠 Stack por defecto ZM Tech

Salvo que el proyecto diga lo contrario:

| Capa          | Default                                           |
| ------------- | ------------------------------------------------- |
| Framework     | Next.js App Router                                |
| UI            | React 19 + Tailwind CSS v4                        |
| Lenguaje      | TypeScript estricto — sin `any` implícito         |
| Base de datos | Supabase (PostgreSQL + Auth + RLS)                |
| ORM           | Drizzle ORM (proyectos con Express)               |
| Mobile        | Expo SDK 54 + React Native                        |
| Monorepo      | Turborepo + Yarn 4 (mayoría) / pnpm (guataparobr) |
| Imágenes      | Cloudinary                                        |
| Iconos        | Lucide React                                      |
| Deploy        | Vercel (web) + EAS (mobile)                       |

---

## 🎨 Identidad visual de la landing ZM Tech

Lenguaje técnico-industrial único (`aeom0/ZMTech`):

| ❌ Genérico     | ✅ ZM Tech                   |
| --------------- | ---------------------------- |
| Enviar / Submit | TRANSMITIR DATOS             |
| Contacto        | Inicializar Conexión         |
| FAQ             | Protocolos Frecuentes        |
| Cotizar         | INICIAR SISTEMA              |
| Ver servicios   | VER ECOSISTEMA               |
| En línea        | SISTEMAS OPERATIVOS EN LÍNEA |

**Tailwind v4 en la landing:**

```
bg-linear-to-r/t/l/b   ✅  (NO bg-gradient-to-*)
bg-white/3              ✅  (NO bg-white/[0.03])
border-white/8          ✅
```

---

## 📐 Convenciones globales ZM Tech

### Arquitectura

- Separación estricta de capas: UI / lógica / servicios / contexto / navegación
- Un componente = una responsabilidad (+150 líneas → dividir)
- Contenido separado de presentación — strings en `content.ts` o `tokens/`, nunca en JSX
- Mobile-first siempre — 375px como viewport de referencia
- Props siempre con interfaces nombradas en `types/index.ts`
- Sin dependencias nuevas sin confirmar con Alberto

### Commits

```
feat:     nueva funcionalidad
fix:      corrección de bug
design:   cambios visuales / tokens / estilos
docs:     documentación
refactor: sin cambio de comportamiento
chore:    config, deps, scripts
```

### Checklist antes de cualquier PR

- [ ] TypeScript compila sin errores
- [ ] Se ve bien en 375px
- [ ] Sin strings hardcodeados en JSX
- [ ] Interfaces en `types/index.ts`
- [ ] `alt` en todas las imágenes
- [ ] ESLint sin warnings

---

## 🚀 Comandos frecuentes

```bash
# Landing ZMTech (pnpm)
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm typecheck

# ZM Lash & Nails Beauty (yarn)
nvm use                          # siempre primero
yarn dev                         # app móvil Expo
yarn web:dev                     # Next.js web
yarn db:push                     # schema Drizzle
cd apps/mobile && npx eas update --branch production --message "..."

# Monorepos Yarn 4 (geemastudio legacy, condoapp, ia-scout360, zetaeme)
# RepMAX activo: pnpm en zm-tech
yarn install
yarn dev / yarn web:dev / yarn mobile:dev
yarn check:types && yarn lint

# Monorepo pnpm (guataparobr)
pnpm dev
pnpm --filter web dev
pnpm --filter admin dev
pnpm build && pnpm type-check
```

---

## 📋 Modelo comercial ZM Tech

| Concepto                      | Referencia                 |
| ----------------------------- | -------------------------- |
| Proyecto base (sitio + panel) | $300–$500 USD              |
| Módulos adicionales           | $40–$100 c/u               |
| Soporte mensual               | $30/mes                    |
| Pago                          | 50% arranque / 50% entrega |
| Soporte post-entrega          | 30 días incluidos          |

---

_Skill mantenido por Alberto. Actualizar al incorporar nuevos proyectos._
_Última actualización: Agosto 2026 — correo canónico `alberto@zmtechdev.com`_
