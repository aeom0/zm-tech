# RepMAX — App Mobile

Expo (SDK 56) para tiendas de autopartes: inventario, POS, clientes, caja, onboarding.

Docs de producto: [docs/repmax/README.md](../../docs/repmax/README.md)

## Requisitos

- Node 22+, pnpm 11 (desde la raíz del monorepo)
- Expo Go o emulador Android / iOS

## Desarrollo

Desde la **raíz** de `zm-tech`:

```bash
pnpm install
pnpm dev:repmax:mobile
```

O dentro de la app:

```bash
cd apps/repmax-mobile
pnpm start
```

Habla directo con Supabase (Auth + tablas `repmax_*`). No hay API Express.

## Variables de entorno

Crear `apps/repmax-mobile/.env` (gitignored):

```
EXPO_PUBLIC_SUPABASE_URL=https://llacowjutjfefboqgfnj.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

Ver `.env.example` si existe en esta carpeta.
