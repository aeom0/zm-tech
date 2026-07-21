# ZM Tech — Landing Page

Sitio web de presentación corporativa para **ZM Tech**, empresa de ingeniería de software con identidad técnico-industrial, especializada en soluciones para LATAM.

## Stack

| Tecnología | Versión | Uso |
|---|---|---|
| Next.js | 16.x | Framework (App Router) |
| TypeScript | 5.x | Tipado estricto |
| Tailwind CSS | v4 | Estilos — sintaxis `bg-linear-to-*`, spacing dinámico |
| Framer Motion | 12.x | Animaciones con `whileInView`, stagger |
| React Hook Form + Zod | — | Formulario de contacto con validación |
| Lucide React | — | Iconografía |
| ESLint | 9.x | `eslint.config.mjs` (flat config) + `eslint-config-next` |

## Estructura

```
src/
├── app/
│   ├── layout.tsx          # Metadata SEO + fuentes Inter/Space Grotesk
│   ├── page.tsx            # Composición de secciones
│   └── globals.css         # Grid técnico, custom animations, scrollbar
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx      # Sticky, glassmorphism al scroll, "INICIAR SISTEMA"
│   │   └── Footer.tsx      # 4 columnas, "Hecho con ⚡ en Venezuela"
│   ├── sections/
│   │   ├── Hero.tsx        # 2 col: H1 gradiente + imagen con card flotante
│   │   ├── TrustBanner.tsx # Franja MLB Standards
│   │   ├── Verticals.tsx   # 3 cards con grayscale → color hover
│   │   ├── Features.tsx    # Layout asimétrico + terminal box
│   │   ├── ContactForm.tsx # "Inicializar Conexión" / "TRANSMITIR DATOS"
│   │   └── FAQ.tsx         # "Protocolos Frecuentes" accordion
│   └── ui/
└── types/
    └── index.ts
```

## Lenguaje de UI (técnico-industrial)

| Convencional | ZM Tech |
|---|---|
| Enviar | TRANSMITIR DATOS |
| Contacto | Inicializar Conexión |
| FAQ | Protocolos Frecuentes |
| Cotizar | INICIAR SISTEMA |
| Ver servicios | VER ECOSISTEMA |

## Comandos

```bash
pnpm install       # Instalar dependencias
pnpm dev           # Servidor local → localhost:3000
pnpm build         # Build de producción
pnpm lint          # ESLint (eslint src/)
pnpm typecheck     # TypeScript (tsc --noEmit)
```

## Notas Tailwind v4

- Gradientes: `bg-linear-to-r` (canónico v4), no `bg-gradient-to-r`
- Spacing dinámico: `w-150 = 37.5rem`, `h-105 = 26.25rem` — sin corchetes
- Opacidad: `bg-white/3`, `border-white/8` (no `[0.03]`)

## Despliegue

Optimizado para Vercel. Push a `main` → deploy automático.

---

© 2025 ZM Tech. Todos los derechos reservados.
