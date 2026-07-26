---
name: guataparo-dev
description: >
  Skill especializado para el proyecto "Guataparo Bienes Raíces". Actívalo siempre
  que el usuario mencione Guataparo, Morelba, el repo guataparobr, propiedades
  inmobiliarias en Valencia Venezuela, o cualquier componente del stack de este proyecto.
  Contiene stack, paleta de colores exacta, esquema de base de datos, convenciones
  de código y estado actual del roadmap.
---

# Guataparo Bienes Raíces — Dev Skill

> Lee este archivo completo antes de tocar una sola línea del proyecto.
> Complementa el skill `zmtech-dev` con detalles específicos de este cliente.

---

## 🏠 Contexto del proyecto

Plataforma inmobiliaria propia para **Morelba Hernández**, agencia **Guataparo Bienes Raíces**,
Valencia, Venezuela. Reemplaza su dependencia de Wasi (CRM SaaS) con solución 100% propia.

- **Repo:** `aeom0/guataparobr`
- **Deploy web:** `guataparobr.com` (Vercel, pendiente dominio final)
- **Deploy admin:** `admin.guataparobr.com` (Vercel, acceso privado)
- **Desarrollado por:** ZM Tech (Alberto)
- **Inicio:** Abril 2026

---

## 🛠 Stack tecnológico (no negociable)

| Capa | Tecnología | Versión |
|------|------------|---------|
| Monorepo | Turborepo + pnpm | workspaces |
| Framework | Next.js App Router | 16.2 |
| UI | React | 19 |
| Estilos | Tailwind CSS | v4 |
| Base de datos | Supabase (PostgreSQL + Auth) | latest |
| Imágenes | Cloudinary Upload Widget | latest |
| Lenguaje | TypeScript strict | 5.9 |
| Deploy | Vercel | — |

**⚠️ No instalar dependencias nuevas sin confirmar con Alberto.**

---

## 📁 Estructura del monorepo

```
guataparobr/
├── apps/
│   ├── web/          → sitio público (puerto 3000)
│   └── admin/        → panel de asesores (puerto 3001)
└── packages/
    ├── @repo/database
    ├── @repo/ui
    ├── @repo/config-cloudinary
    ├── @repo/typescript-config
    └── @repo/eslint-config
```

---

## 🎨 Sistema de diseño — Paleta de marca

Extraída de `PaletaColores_GuataparoBR.png` (imagen oficial del cliente):

```css
--gbr-negro:   #1B1A1B;   /* estructura, nav, headers */
--gbr-dorado:  #AF8D59;   /* acción, CTAs, precios, highlights */
--gbr-bronce:  #89715F;   /* hover del dorado, iconos secondary */
--gbr-crema:   #D5D0CA;   /* bordes suaves, divisores */
--gbr-carbon:  #4D4E49;   /* texto secundario, labels */
--gbr-perla:   #CECFCA;   /* superficies, inputs */
--gbr-marfil:  #F1F2ED;   /* fondo de página */
```

**Regla:** Negro para estructura. Dorado para acción. Nunca invertir.

### Fuentes
- **Titulares:** Playfair Display (`--font-display`)
- **Cuerpo / UI:** Montserrat (`--font-sans`)

### Clases Tailwind disponibles
```tsx
className="bg-brand-negro text-brand-dorado"
className="bg-brand-marfil border-brand-crema"
className="btn-primary"    // dorado sobre negro
className="btn-dark"       // negro con texto dorado
className="btn-outline"    // borde dorado, transparente
className="card"           // card base
className="badge-gold"     // pill dorado
className="info-chip"      // chip m²/hab/baños
```

---

## 🗄 Base de datos — Esquema Supabase

```sql
properties ( id, slug UNIQUE, title, description,
  type TEXT  -- 'apartamento'|'casa'|'local'|'terreno'
  operation TEXT  -- 'venta'|'alquiler'
  price NUMERIC, currency TEXT DEFAULT 'USD',
  zone, city DEFAULT 'Valencia',
  bedrooms INT, bathrooms INT, parking INT, area_m2 NUMERIC,
  images TEXT[], whatsapp TEXT,
  agent_id UUID FK → agents,
  featured BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'activa',  -- 'activa'|'vendida'|'alquilada'
  created_at, updated_at )

agents ( id, name, email UNIQUE, phone, whatsapp,
  photo_url, role TEXT DEFAULT 'asesor',  -- 'admin'|'asesor'
  active BOOLEAN DEFAULT true, created_at )

leads ( id, name, email, phone, message,
  property_id UUID FK → properties nullable,
  source TEXT,  -- 'whatsapp'|'formulario'|'catalogo'
  status TEXT DEFAULT 'nuevo',  -- 'nuevo'|'contactado'|'cerrado'
  created_at )
```

### RLS
- `properties`: lectura pública / escritura solo autenticado
- `agents`: lectura pública / escritura solo `admin`
- `leads`: solo `service_role` — nunca expuesto al público

---

## 🔑 Variables de entorno

```env
# apps/web/.env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# apps/admin/.env.local (adicionales)
SUPABASE_SERVICE_ROLE_KEY=       # NUNCA en apps/web
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
WASI_API_BASE_URL=
WASI_API_KEY=
```

---

## 🚀 Estado actual del roadmap

```
Fase 0 ✅  Fundación completa
           - Repo + monorepo Turborepo
           - CLAUDE.md, README.md, ROADMAP.md
           - Sistema de diseño (tokens, tailwind, globals.css)
           - PropertyCard + Button migrados a CSS vars de marca
           - Commit 4c6e852

Fase 1 🔄  Supabase + Auth (PRÓXIMO)
           - Tablas: properties, agents, leads + RLS
           - Login asesores en apps/admin
           - Roles: admin | asesor

Fase 2 ⏳  CRUD propiedades (admin)
Fase 3 ⏳  Sitio público conectado a Supabase
Fase 4 ⏳  SEO + migración desde Wasi API
Fase 5 ⏳  Leads + deploy producción
Fase 6 ⏳  Soporte mensual $30/mes
```

---

## ✅ Checklist antes de cada commit

- [ ] `pnpm type-check` sin errores
- [ ] `pnpm lint` sin warnings
- [ ] Se ve bien en 375px
- [ ] `SUPABASE_SERVICE_ROLE_KEY` solo en `apps/admin`
- [ ] RLS correcto en Supabase
- [ ] `alt` en todas las imágenes

---

*Skill mantenido por ZM Tech (Alberto). Última actualización: Abril 2026*
