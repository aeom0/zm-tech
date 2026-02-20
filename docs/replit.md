# ZM Lash & Nails Beauty

## Información del Proyecto

**Idioma del proyecto**: Español (todas las interfaces, documentación y comunicación deben estar en español)

## Descripción General

ZM Lash & Nails Beauty es una aplicación de gestión para salón de belleza, construida como app multiplataforma React Native/Expo con backend Express. La app proporciona un dashboard administrativo para gestionar citas, personal, servicios, inventario y finanzas de un centro de estética ubicado en Perú. El diseño sigue una estética lujosa con tonos violeta y dorado, con sensación de spa premium.

## Preferencias del Usuario

Estilo de comunicación preferido: Lenguaje simple y cotidiano en español.

## Arquitectura del Sistema

### Arquitectura Frontend

**Framework**: React Native con Expo SDK 54
- Usa el flujo gestionado de Expo con nueva arquitectura habilitada
- Soporta plataformas iOS, Android y Web con un solo código base
- Usa React 19.1 para las últimas características

**Navegación**: React Navigation v7
- Navegación por pestañas inferiores con 5 pantallas principales: Inicio, Agenda, Servicios, Inventario, Finanzas
- Navegadores de stack nativos para cada sección de pestaña
- Encabezados transparentes con efectos de blur en iOS

**Gestión de Estado**: TanStack Query (React Query)
- Gestión de estado del servidor para obtener datos de la API
- Caché automático, recarga y actualizaciones en segundo plano
- Cliente de consultas personalizado con helpers para peticiones API

**Enfoque de Estilos**:
- Estilos basados en StyleSheet siguiendo patrones de React Native
- Sistema de tema centralizado en `client/constants/theme.ts`
- Soporte para modo claro/oscuro con detección automática del esquema de colores
- Paleta de colores personalizada: Violeta primario (#7B2D8E), Acento dorado (#D4AF37)

**Librerías UI Principales**:
- Reanimated para animaciones
- Gesture Handler para interacciones táctiles
- Expo Haptics para retroalimentación táctil
- Expo Blur para efectos de cristal

### Arquitectura Backend

**Framework**: Express 5 con TypeScript
- Diseño de API RESTful
- CORS configurado para entorno de desarrollo Expo
- Corre en el puerto 5000

**Base de Datos**: PostgreSQL con Drizzle ORM
- Esquema definido en `shared/schema.ts`
- Consultas type-safe con Drizzle
- Integración con Zod para validación vía drizzle-zod

**Modelos de Datos**:
- Chicas (personal con codificación de colores; en UI y mensajes se usa "chicas" en lugar de "empleadas")
- Categorías de Servicios y Servicios (con precios/duración)
- Clientes
- Citas (programación con seguimiento de estado)
- Artículos de Inventario (con alertas de stock mínimo)
- Pagos (seguimiento financiero)

### Organización del Código

```
client/           # Código de la app React Native
├── components/   # Componentes UI reutilizables
├── screens/      # Componentes de pantalla para cada pestaña
├── navigation/   # Configuración de React Navigation
├── hooks/        # Hooks personalizados (useTheme, useScreenOptions)
├── lib/          # Utilidades (cliente de consultas, helpers API)
├── constants/    # Colores del tema, tipografía, espaciado

server/           # Backend Express
├── index.ts      # Entrada del servidor, CORS, servicio estático
├── routes.ts     # Definiciones de rutas API
├── storage.ts    # Interfaz de operaciones de base de datos
├── db.ts         # Conexión Drizzle/PostgreSQL

shared/           # Compartido entre cliente y servidor
├── schema.ts     # Esquema de base de datos Drizzle + tipos Zod
```

### Endpoints de la API

**Dashboard**:
- `GET /api/dashboard/stats` - Estadísticas del dashboard (ingresos, citas, alertas)

**Chicas (employees)**:
- `GET /api/employees` - Listar chicas
- `POST /api/employees` - Crear chica
- `PUT /api/employees/:id` - Actualizar chica
- `DELETE /api/employees/:id` - Eliminar chica

**Servicios**:
- `GET /api/services` - Listar servicios
- `GET /api/service-categories` - Listar categorías
- `POST /api/services` - Crear servicio
- `PUT /api/services/:id` - Actualizar servicio
- `DELETE /api/services/:id` - Eliminar servicio

**Clientes**:
- `GET /api/clients` - Listar clientes
- `POST /api/clients` - Crear cliente
- `PUT /api/clients/:id` - Actualizar cliente

**Citas**:
- `GET /api/appointments` - Listar citas (filtrable por fecha)
- `POST /api/appointments` - Crear cita
- `PUT /api/appointments/:id` - Actualizar cita
- `DELETE /api/appointments/:id` - Eliminar cita
- `GET /api/appointments/check-availability` - Verificar disponibilidad (anti-overbooking)

**Inventario**:
- `GET /api/inventory` - Listar artículos de inventario
- `POST /api/inventory` - Crear artículo
- `PUT /api/inventory/:id` - Actualizar artículo
- `DELETE /api/inventory/:id` - Eliminar artículo

**Pagos**:
- `GET /api/payments` - Listar pagos
- `POST /api/payments` - Registrar pago

**Webhook**:
- `POST /webhook/whatsapp` - Webhook para integración con n8n/WhatsApp

### Compilación y Desarrollo

**Desarrollo**:
- `npm run expo:dev` - Iniciar servidor de desarrollo Expo
- `npm run server:dev` - Iniciar backend Express con tsx

**Producción**:
- `npm run expo:static:build` - Compilar bundle web estático
- `npm run server:build` - Empaquetar servidor con esbuild
- `npm run server:prod` - Ejecutar servidor en producción

**Base de Datos**:
- `npm run db:push` - Aplicar cambios de esquema a PostgreSQL

## Dependencias Externas

### Base de Datos
- PostgreSQL (integrado de Replit) vía variable de entorno `DATABASE_URL`
- Drizzle ORM para acceso type-safe a la base de datos

### Variables de Entorno
- `DATABASE_URL` - Cadena de conexión PostgreSQL (requerido)
- `EXPO_PUBLIC_DOMAIN` - Dominio API para peticiones del cliente
- `REPLIT_DEV_DOMAIN` / `REPLIT_DOMAINS` - Dominios de despliegue Replit

### Paquetes NPM Principales
- `expo` - Framework principal para desarrollo multiplataforma
- `drizzle-orm` + `pg` - ORM de base de datos y driver PostgreSQL
- `@tanstack/react-query` - Gestión de estado del servidor
- `react-native-reanimated` - Animaciones avanzadas
- `expo-haptics` - Retroalimentación táctil en móvil

## Cambios Recientes (feb 2025)

- **Auth**: Splash + Login para mobile (AuthContext, admin/admin123). Web: Landing → "Acceder al panel" → Login
- **Terminología**: "Empleadas" → "Chicas" en UI, API y WhatsApp
- **Servicios**: Catálogo actualizado según LISTA DE PRECIOS ZM (~58 servicios)
- **TypeScript**: `apps/mobile/tsconfig.json` usa config independiente con `module: "esnext"`

## Información del Negocio

- **Ubicación**: Perú
- **Horario de Atención**: 9:00 AM a 8:00 PM, Lunes a Domingo
- **Moneda**: Soles peruanos (S/)
- **Categorías de Servicios**: Extensiones de Pestañas, Lifting, Cejas y Rostro, Uñas, Microblading, Depilación
