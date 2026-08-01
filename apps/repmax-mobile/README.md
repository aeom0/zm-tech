# RepMAX Business Suite — App Mobile

App React Native + Expo para gestión de tiendas de autopartes (inventario, POS, clientes, caja, onboarding).

Documentación del monorepo: [../../docs/README.md](../../docs/README.md)

---

## Requisitos

- Node.js 20+
- Yarn 4 (desde la raíz del monorepo)
- Expo Go o emulador Android / iOS

---

## Instalación y desarrollo

Desde la **raíz** del repo (recomendado):

```bash
yarn install
yarn mobile
```

O dentro de `apps/mobile`:

```bash
cd apps/mobile
yarn start    # Expo DevTools
yarn android
yarn ios
```

El API Express debe estar en marcha si vas a usar datos reales (puerto 5000 por defecto). Ver [docs/development.md](../../docs/development.md).

---

## Variables de entorno

Archivo `apps/mobile/.env`:

```env
# Emulador Android → host WSL
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000

# Dispositivo físico (IP LAN del PC)
# EXPO_PUBLIC_API_URL=http://192.168.x.x:5000
```

---

## Estructura (`apps/mobile`)

```
App.tsx                         # AuthProvider > CartProvider > AppNavigator
src/
├── navigation/                 # AppNavigator, Auth, Main, Onboarding…
├── context/                    # AuthContext, CartContext, OnboardingContext
├── screens/
│   ├── auth/
│   ├── onboarding/             # Flujo completo onboarding
│   ├── dashboard/
│   ├── pos/
│   ├── inventory/
│   ├── customers/
│   ├── reports/
│   └── settings/
├── hooks/
├── services/                   # Llamadas a la API REST
├── types/database.ts
├── constants/
└── utils/                      # theme (Industrial Dark), api, formatters
```

Tipografía: **Inter** (`@expo-google-fonts/inter`) — ver `src/utils/theme.ts`.

---

## Arquitectura

- **Screens:** solo UI; sin lógica de negocio pesada.
- **Hooks:** estado y orquestación.
- **Services:** único acceso HTTP a la API.

El backend vive en `apps/server` del mismo monorepo (hoy incluye al menos rutas públicas del storefront; las rutas JWT del POS deben estar alineadas con tu despliegue).

---

## Build producción (EAS)

```bash
# Requiere EAS CLI
eas build --platform android
eas build --platform ios
```
