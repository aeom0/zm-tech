# CLAUDE.md — ZM Tech Landing

> Monorepo: app en `apps/landing`. Skills: `.cursor/skills/zmtech-dev`. Claude: `.claude/skills` → symlink.

## Producto

- **URL:** https://zmtechdev.com (`/es` default, `/en` inglés)
- **Vercel:** project `zmtech` (root del monorepo apunta a `apps/landing` vía link)
- **Supabase:** `llacowjutjfefboqgfnj` (contactos / quote_leads; service role en API routes)
- **Fuera de locale:** `/propuesta/[slug]`, `/api/*`

## i18n (sin next-intl)

1. Locales: `es` | `en` en `src/content/locales.ts`
2. Copy: `src/content/es.ts` + `en.ts` tipados con `Messages`
3. Helper: `getMessages(locale)` — las secciones reciben `messages` por props
4. Middleware: `/` → `/es`; header `x-locale` para `<html lang>`
5. Cotizador público: locale en `@zmtech/quote-engine` (`getPublicServiceCopy`, `generateWhatsAppMsg`, `ComboBanner`)
6. **No** mezclar strings nuevos inline en componentes — agregar claves a ambos diccionarios

## Stack

- Next.js 16 App Router · TypeScript estricto · Tailwind v4 · Framer Motion 12
- React Hook Form + Zod · Lucide · `@zmtech/quote-engine`

## Tailwind v4

```
bg-linear-to-r/t/l/b   ✅  (NO bg-gradient-to-*)
w-150, h-105           ✅  spacing on-demand
bg-white/3             ✅  (NO bg-white/[0.03])
```

## UI

- Español LATAM en `/es`; inglés profesional en `/en` (sin forzar jerga VE)
- Sin emojis Unicode en UI (salvo copy WABA si aplica)
- Secciones: `py-24`, `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- Imágenes externas: `images.unsplash.com` (next.config)
- Hero devices: `HeroDeviceMockup` — CSS 3D + Framer (`rotateY` en escena, teclado con `rotateX` local). No añadir Three/`@react-three/fiber` al hero.

## Comandos

```bash
pnpm dev:landing
pnpm --filter landing build
pnpm --filter landing lint
pnpm --filter landing typecheck
```

## Repo

`origin` → `https://github.com/aeom0/zm-tech.git` · rama `main`
