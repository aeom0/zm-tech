# 📚 Índice de Documentación

Documentación completa del sistema ZM Lash & Nails Beauty.

## 📖 Documentación Principal

### [CLAUDE.md](../CLAUDE.md)
**Para: Claude Code / Asistentes IA**
**Ubicación: Raíz del proyecto**

Guía rápida para trabajar con este proyecto:
- Stack tecnológico
- Estructura del proyecto
- Comandos principales
- Arquitectura de la base de datos
- API endpoints
- Sistema de diseño

### [replit.md](replit.md)
**Para: Desarrolladores / Arquitectura**

Documentación técnica completa:
- Arquitectura del sistema
- Referencia completa de API
- Configuración de deployment
- Integraciones (WhatsApp, n8n)
- Información del negocio

### [design_guidelines.md](design_guidelines.md)
**Para: Diseñadores / Frontend**

Sistema de diseño y especificaciones UI/UX:
- Paleta de colores (Violeta + Oro)
- Tipografía y espaciado
- Componentes reutilizables
- Navegación y flujos
- Guías de animación

### [COMPARACION_PROYECTOS_Y_MEJORAS.md](COMPARACION_PROYECTOS_Y_MEJORAS.md)
**Para: Arquitectura / Decisiones de producto**

Comparación con IA Scout360 y sugerencias para diferenciación web/mobile (ZM ya es monorepo).

### [MONOREPO_MIGRACION.md](MONOREPO_MIGRACION.md)
**Para: Desarrollo / Migración**

Guía de la migración a monorepo: estructura actual, comandos, Vercel, carpetas antiguas.

### [README.md](README.md)
**Para: Setup inicial**

Instrucciones de configuración original:
- Instalación de dependencias
- Configuración de PostgreSQL
- Variables de entorno
- Primeros pasos

## 🗂️ Organización de Archivos

```
CLAUDE.md                    # Guía para Claude Code (raíz)

docs/
├── INDEX.md                         # Este archivo
├── COMPARACION_PROYECTOS_Y_MEJORAS.md  # Comparación IA Scout360 vs ZM, web/mobile
├── replit.md                        # Documentación técnica completa
├── design_guidelines.md             # Sistema de diseño
└── README.md                        # Setup inicial

scripts/
├── build.js                 # Build de producción
└── db/
    ├── seed-services.sql    # 58 servicios (LISTA DE PRECIOS ZM)
    └── seed-employees.sql   # 4 chicas con comisiones

.cursor/
├── README.md                # Info sobre Cursor AI
└── rules/                   # Reglas de desarrollo
    ├── arquitectura.mdc
    ├── business-logic.mdc
    ├── idioma.mdc
    └── ... (más reglas)
```

## 🎯 Guías por Rol

### Para Desarrolladores Backend
1. Leer [replit.md](replit.md) - Sección "Arquitectura del Sistema"
2. Revisar [CLAUDE.md](../CLAUDE.md) - Sección "Stack Tecnológico"
3. Consultar API endpoints en [replit.md](replit.md)

### Para Desarrolladores Frontend
1. Leer [design_guidelines.md](design_guidelines.md) - Sistema completo
2. Revisar [CLAUDE.md](../CLAUDE.md) - Sección "Patrones Importantes"
3. Ver estructura de navegación en [design_guidelines.md](design_guidelines.md)

### Para DevOps / Deployment
1. Leer [replit.md](replit.md) - Sección "Configuración"
2. Revisar [README.md](README.md) - Setup de base de datos
3. Configurar variables de entorno según `.env.example`

### Para Product Managers
1. Leer [replit.md](replit.md) - Información del negocio
2. Revisar servicios en `scripts/db/seed-services.sql`
3. Ver esquema de comisiones en `scripts/db/seed-employees.sql`

## 🔧 Referencias Rápidas

### Base de Datos
- **Scripts de seed**: `scripts/db/`
- **Schema TypeScript**: `shared/schema.ts`
- **Migraciones**: `drizzle.config.ts`

### API
- **Rutas**: `server/routes.ts`
- **Storage**: `server/storage.ts`
- **WhatsApp**: `server/whatsapp.ts`

### Frontend
- **Componentes**: `apps/mobile/components/`
- **Pantallas**: `apps/mobile/screens/`
- **Navegación**: `apps/mobile/navigation/`
- **Auth**: `apps/mobile/contexts/AuthContext.tsx`
- **Theme**: `apps/mobile/constants/theme.ts`

## 📞 Información de Contacto

- **Ubicación**: Lima, Perú
- **Horario**: Lunes a Sábado, 9 AM - 8 PM
- **Moneda**: Soles (S/)
- **WhatsApp**: +584144940417

## 🔄 Actualizaciones

Este índice se actualiza con cada cambio significativo en la documentación.

**Última actualización**: 2025-02-13

- Auth: Splash + Login para mobile (admin/admin123), logout en Perfil
- Terminología: empleadas → chicas en toda la app
- Servicios: catálogo actualizado según LISTA DE PRECIOS ZM (~58 servicios)
- tsconfig: mobile con `module: "esnext"` (config independiente)
