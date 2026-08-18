# RepMAX — App Mobile

Expo (SDK 56) para tiendas de autopartes: inventario, POS, clientes, caja, onboarding.

Docs de producto: [docs/repmax/README.md](../../docs/repmax/README.md)  
Brand: [docs/repmax/brand/README.md](../../docs/repmax/brand/README.md)

## Requisitos

- Node 22+, pnpm 11 (desde la raíz del monorepo)
- Expo Go o emulador Android / iOS
- EAS CLI (`eas-cli`) autenticado como `aeom0` para builds/OTA

## Desarrollo

Desde la **raíz** de `zm-tech`:

```bash
pnpm install
pnpm dev:repmax:mobile
```

Habla directo con Supabase (Auth + tablas `repmax_*`). No hay API Express.

## Variables de entorno

Crear `apps/repmax-mobile/.env` (gitignored):

```
EXPO_PUBLIC_SUPABASE_URL=https://llacowjutjfefboqgfnj.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

En EAS (preview / production / development) ya están `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

## EAS + OTA

| Pieza | Valor |
|-------|--------|
| Proyecto | [@aeom0/repmax](https://expo.dev/accounts/aeom0/projects/repmax) |
| Project ID | `109768f2-6e5c-4747-8cb5-2025c8319079` |
| Runtime | `sdkVersion` (SDK 56) |
| Updates URL | `https://u.expo.dev/109768f2-6e5c-4747-8cb5-2025c8319079` |
| Channels | `development` · `preview` · `production` |

OTA al arranque: `App.tsx` chequéa `expo-updates` (timeout 8s) antes de ocultar splash. En `__DEV__` se omite.

### Stack nativo (incluido en el APK)

Pensado para no re-buildear por libs faltantes. UI de fotos/barcode puede llegar por OTA si el nativo ya está.

| Lib | Uso previsto |
|-----|----------------|
| `expo-camera` + `expo-image-picker` | Escaneo / fotos de repuestos |
| `expo-image` + `expo-image-manipulator` | Mostrar y comprimir fotos → Storage |
| `expo-notifications` | Push |
| `expo-updates` | OTA |
| `expo-dev-client` | Development builds |
| `expo-build-properties` | Android SDK 36 / Kotlin |
| `react-native-gesture-handler` | Navegación / gestos |
| `expo-haptics` | Feedback POS |
| `expo-linking` | Deep links / WhatsApp |
| `@react-native-community/netinfo` | Offline awareness |
| `expo-file-system` | Export CSV catálogo ML |
| `expo-sharing` | Compartir comprobantes / export ML |
| `react-native-svg` | Base para charts / íconos vector |

Helpers listos: `src/utils/network.ts`, `src/utils/haptics.ts`.

Fotos de catálogo (reglas ML): `src/utils/mlPhotoRules.ts` + `productPhotoService`. Guía: [docs/repmax/design/ml-fotos.md](../../docs/repmax/design/ml-fotos.md).

### Generar APK (preview, distribución interna)

```bash
cd apps/repmax-mobile
pnpm eas:preview
# o: eas build --platform android --profile preview
```

Perfil `preview` → APK + channel `preview` (listo para OTA).

### Publicar update OTA (sin nuevo APK)

```bash
cd apps/repmax-mobile
eas update --channel preview --message "describe el cambio"
```

Solo JS/assets compatibles con el mismo `runtimeVersion` (SDK 56). Cambios nativos (plugins, permisos, iconos nativos) requieren **nuevo APK**.

### CI (GitHub Actions)

Workflow [`.github/workflows/repmax-ota.yml`](../../.github/workflows/repmax-ota.yml): push a `main` que toque `apps/repmax-mobile` (o schema) → `eas update --channel preview`. Production: Actions → **RepMAX OTA** → Run workflow.

Secretos del repo (`aeom0/zm-tech` → Settings → Secrets):

| Secreto | Dónde |
|---------|--------|
| `EXPO_TOKEN` | [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens) (cuenta `aeom0`) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | anon key del hub `llacowjutjfefboqgfnj` (la misma del `.env` local) |

Sin esos dos, el job falla a propósito para no publicar un bundle cojo.

### Producción

```bash
pnpm eas:production   # APK + channel production + autoIncrement
eas update --channel production --message "..."
```
