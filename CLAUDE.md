# CLAUDE.md — ZM Tech Landing

Contexto para Claude Code al trabajar en este proyecto.

## Stack

- **Next.js 16** (App Router, `src/` directory)
- **TypeScript 6** — tipado estricto, sin `any`
- **pnpm** — package manager (`packageManager` en `package.json`)
- **Tailwind CSS v4** — ver convenciones abajo
- **Framer Motion 12** — animaciones
- **React Hook Form + Zod** — formularios
- **Lucide React** — iconos
- **ESLint 9** — flat config (`eslint.config.mjs`)

## Tailwind v4 — Convenciones

```
bg-linear-to-r/t/l/b   ✅  (NO bg-gradient-to-*)
w-150, h-105, h-130     ✅  spacing dinámico on-demand
bg-white/3              ✅  (NO bg-white/[0.03])
border-white/8          ✅  (NO border-white/[0.08])
```

## Identidad de UI — Lenguaje técnico-industrial

Mantener coherencia en TODO texto visible. Nunca usar términos genéricos:

| ❌ Genérico | ✅ ZM Tech |
|---|---|
| Enviar / Submit | TRANSMITIR DATOS |
| Contacto / Contact | Inicializar Conexión |
| FAQ / Preguntas | Protocolos Frecuentes |
| Cotizar / Quote | INICIAR SISTEMA |
| Ver servicios | VER ECOSISTEMA |
| En línea | SISTEMAS OPERATIVOS EN LÍNEA |

## Comandos

```bash
pnpm install           # dependencias
pnpm dev               # localhost:3000
pnpm build             # build producción (debe ser 0 errores)
pnpm lint              # eslint src/
pnpm typecheck         # tsc --noEmit
```

## Estructura de componentes

```
src/components/
├── layout/   Navbar.tsx, Footer.tsx
└── sections/ Hero, TrustBanner, Verticals, Features, ContactForm, FAQ
```

- Todos los componentes con hooks o animaciones llevan `'use client'`
- Secciones: `py-24`, `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- Imágenes externas: solo `images.unsplash.com` (configurado en `next.config.ts`)

## Repo

`origin` → `https://github.com/aeom0/ZMTech.git` (rama `main`)
