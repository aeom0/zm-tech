# ZM Lash & Nails Beauty

App de gestión para salón de belleza: agenda, servicios, inventario y finanzas. Frontend con React Native (Expo) y backend Express + PostgreSQL (Drizzle).

## Requisitos

- **Node.js** 20+ (recomendado 22; en el repo hay `.nvmrc`: `nvm use`)
- **PostgreSQL** 16 (local o servicio cloud)
- **npm** (viene con Node)

## Desarrollo local

### 1. Clonar e instalar

```bash
git clone <repo>
cd ZM-Lash-and-Nails-Beauty
npm install
```

### 2. Variables de entorno

```bash
cp .env.example .env
```

Editar `.env` y definir al menos:

- **`DATABASE_URL`**: conexión PostgreSQL, ej.  
  `postgresql://usuario:clave@localhost:5432/zm_lash_nails`
- **`EXPO_PUBLIC_API_URL`**: URL del API para el cliente, en local:  
  `http://localhost:5000`

### 3. Base de datos

Crear la base en PostgreSQL y aplicar el esquema:

```bash
npm run db:push
```

### 4. Arrancar backend y Expo

**Opción A – Un solo comando (recomendado):**

```bash
npm run dev
```

Arranca el servidor en el puerto 5000 y Expo en 8081.

**Opción B – Dos terminales:**

```bash
# Terminal 1: backend
npm run server:dev

# Terminal 2: cliente Expo
npm run expo:dev
```

Abrir en el navegador la URL que muestre Expo (por defecto web en `http://localhost:8081`) o escanear el QR con Expo Go en el móvil.

## Scripts útiles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Backend + Expo en paralelo (local) |
| `npm run server:dev` | Solo backend Express (puerto 5000) |
| `npm run expo:dev` | Solo cliente Expo (localhost) |
| `npm run db:push` | Aplicar esquema Drizzle a PostgreSQL |
| `npm run lint` | Linter |
| `npm run check:types` | Verificar tipos TypeScript |

En Replit se puede usar `npm run expo:dev:replit` para el flujo con dominio Replit.

## Estructura resumida

- **`client/`** – App React Native (Expo): pantallas, navegación, hooks, tema.
- **`server/`** – API Express: rutas, storage, DB.
- **`shared/`** – Esquema Drizzle y tipos compartidos.

Documentación detallada de arquitectura, endpoints y negocio: **[replit.md](./replit.md)**.

## Licencia

Privado.
