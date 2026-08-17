# ZM Tech — Landing Page

Sitio corporativo de **ZM Tech** (fábrica de software LATAM).  
**Producción:** [zmtechdev.com](https://zmtechdev.com) · Vercel project `zmtech` · App: `apps/landing`

## Idiomas

| Locale             | URL                 | Notas                                |
| ------------------ | ------------------- | ------------------------------------ |
| Español (default)  | `/es`               | `/` redirige 308 → `/es`             |
| English            | `/en`               | Mirror del funnel público            |
| Propuestas cliente | `/propuesta/[slug]` | Solo español (sin prefijo de locale) |

Copy de marketing y cotizadores públicos vive en `src/content/{es,en}.ts`. No hardcodear strings de UI en secciones.

## Stack

| Tecnología             | Versión   | Uso                               |
| ---------------------- | --------- | --------------------------------- |
| Next.js                | 16.x      | App Router + proxy de locale      |
| TypeScript             | 6.x       | Tipado estricto                   |
| Tailwind CSS           | v4        | Estilos                           |
| Framer Motion          | 12.x      | Animaciones                       |
| React Hook Form + Zod  | —         | Formulario de contacto            |
| `@zmtech/quote-engine` | workspace | Cotizador `/[locale]/cotizador`   |
| Lucide React           | —         | Iconos (sin emojis Unicode en UI) |

## Estructura

```
src/
├── proxy.ts                   # / → /es; set x-locale
├── content/                   # Diccionarios ES/EN (Messages)
│   ├── locales.ts
│   ├── messages.ts            # Tipos
│   ├── es.ts / en.ts
│   └── index.ts               # getMessages(locale)
├── app/
│   ├── layout.tsx             # html lang dinámico + metadataBase
│   ├── [locale]/
│   │   ├── layout.tsx         # generateMetadata + alternates
│   │   ├── page.tsx           # Home marketing
│   │   └── cotizador/         # Quote builder público
│   ├── propuesta/[slug]/      # Propuestas cliente (ES)
│   └── api/                   # contact, cotizador/lead, propuesta/enviar
├── components/
│   ├── layout/                # Navbar (switcher ES|EN), Footer
│   └── sections/              # Hero, Verticals, Cotizador home, …
└── data/quotes/               # QuoteDefinition por cliente
```

## Env (Vercel project `zmtech`)

| Variable                    | Uso                                      |
| --------------------------- | ---------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`      | Canonical / OG — `https://zmtechdev.com` |
| `SUPABASE_URL`              | Proyecto `llacowjutjfefboqgfnj`          |
| `SUPABASE_SERVICE_ROLE_KEY` | Contact + leads                          |
| `RESEND_API_KEY`            | Envío de avisos (formulario/propuesta)   |

Inbox `alberto@zmtechdev.com` llega por **ImprovMX** (MX del dominio). No hace falta `CONTACT_EMAIL`. Resend solo **envía**; el sandbox sigue como `from` hasta verificar el dominio en Resend.

## Comandos

Desde la raíz del monorepo:

```bash
pnpm dev:landing
pnpm --filter landing build
pnpm --filter landing lint
pnpm --filter landing typecheck
```

## Despliegue

Push a `main` → Vercel `zmtech`. Dominios: `zmtechdev.com` + `www`.  
Inventario de repos/productos: [PROYECTOS.md](./PROYECTOS.md).  
Roadmap del producto: [ROADMAP.md](./ROADMAP.md).  
Backlog UI/UX pendiente: [UX-BACKLOG.md](./UX-BACKLOG.md).

---

© 2026 ZM Tech.
