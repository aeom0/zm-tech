# ZM Lash & Nails Beauty 💅✨

Sistema de gestión integral para salón de belleza en Perú.

## 🚀 Inicio Rápido

```bash
# Instalar dependencias
npm install

# Configurar base de datos
cp .env.example .env
# Editar .env con tus credenciales

# Inicializar base de datos
npm run db:push
npm run db:seed

# Iniciar en desarrollo
npm run dev
```

## 📱 Características

- **Gestión de Citas**: Sistema de calendario con asignación de chicas
- **Auth**: Splash + Login (admin/admin123). Cerrar sesión en Perfil
- **WhatsApp Bot**: Respuestas automáticas y registro de clientes
- **Inventario**: Control de stock con alertas de productos bajos
- **Finanzas**: Reportes de ingresos y comisiones
- **Multi-plataforma**: iOS, Android y Web desde un solo código

## 🛠️ Stack Tecnológico

- **Frontend**: React Native + Expo SDK 54
- **Backend**: Express 5 + TypeScript
- **Base de Datos**: PostgreSQL 16 + Drizzle ORM
- **WhatsApp**: Meta Business API con webhooks

## 📚 Documentación

- [**CLAUDE.md**](CLAUDE.md) - Guía para Claude Code (raíz)
- [**Índice Completo**](docs/INDEX.md) - Navegación de toda la documentación
- [**Arquitectura**](docs/replit.md) - Documentación técnica completa
- [**Diseño**](docs/design_guidelines.md) - Sistema de diseño y UI/UX
- [**Setup Original**](docs/README.md) - Instrucciones de configuración

## 📂 Estructura del Proyecto

```
├── client/          # Frontend React Native/Expo
├── server/          # Backend Express + API
├── shared/          # Código compartido (schemas, tipos)
├── scripts/
│   └── db/          # Scripts SQL de base de datos
├── docs/            # Documentación del proyecto
└── .cursor/         # Reglas de desarrollo con Cursor AI
```

## 🔧 Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Backend + Expo en paralelo |
| `npm run server:dev` | Solo backend (puerto 5000) |
| `npm run expo:dev` | Solo frontend Expo |
| `npm run db:push` | Aplicar schema a PostgreSQL |
| `npm run lint` | Verificar código con ESLint |
| `npm run format` | Formatear código con Prettier |

## 🎨 Servicios Disponibles (LISTA DE PRECIOS ZM)

- **Extensiones de Pestañas**: Clásicas, Rimel, Mojado, Baby Volumen, Volumen Russo, retoques, promos Yape/Plin
- **Lifting**: Lifting, Tinturado, Diseño + Planchado/Tinturado cejas, promos
- **Cejas y Rostro**: Depilación, diseño, laminado, rostro, bozo
- **Uñas**: Manicure, Rubber, Polly Gel, Soft Gel, pedicure, diseño, Retiro, packs, Promo Aurora
- **Microblading**: Cejas, Shading, Microlips, Hidra Lips
- **Depilación**: Axilas, bikini, piernas, línea ombligo, packs combinados

## 👥 Equipo

- **Vanessa** (Dueña) - 🟡 Oro
- **Sthefani** - 🟣 Púrpura
- **Romina** - 💗 Rosa
- **Yosaida** - 🔵 Cyan

## 💰 Esquema de Comisiones

- **Chicas**: 60% chica / 40% casa
- **Vanessa**: 100% cuando trabaja, 40% de trabajos de las chicas
- **Gastos cubiertos por casa**: Insumos, arriendo, arbitrios

## 🔐 Variables de Entorno

Ver [`.env.example`](.env.example) para configuración completa:
- `DATABASE_URL` - Conexión PostgreSQL
- `WHATSAPP_ACCESS_TOKEN` - Token de Meta API
- `WHATSAPP_VERIFY_TOKEN` - Token de verificación webhook

## 📞 Soporte

Para problemas o consultas, revisar la documentación en [`docs/`](docs/).

---

**Versión**: 1.0.0
**Licencia**: Privado
**Stack**: React Native + Express + PostgreSQL
