# 01 — Scaffold: subtree merge + alineación de versiones

> **Estado: CERRADO** (ago 2026). Documento histórico. Fuente de verdad actual: [../README.md](../README.md).

**Objetivo de esta fase:** RepMAX vive dentro de `zm-tech`, compila con pnpm, en las mismas versiones que el resto del monorepo. Todavía habla con Express+JWT+Postgres suelto — eso se toca en la fase 03, no acá. No mezclar los dos problemas.

---

## Paso 1 — Subtree merge (preserva historia, igual que el cutover del monorepo)

```bash
cd ~/zm-tech
git remote add repmax-origin https://github.com/aeom0/RepMAX.git
git fetch repmax-origin main

# Trae todo RepMAX bajo un prefijo temporal, con --no-ff para no perder lineage
git subtree add --prefix=apps/_repmax-import repmax-origin main --squash
```

> Nota: usa `--squash` acá (no `--no-ff` como en el cutover del monorepo) porque RepMAX es un repo externo completo con su propio historial de yarn/turbo — no interesa traer cada commit individual de su desarrollo, solo el snapshot final. Esto es distinto al subtree del monorepo interno, que sí preservó lineage completo.

## Paso 2 — Reorganizar dentro de la estructura del monorepo

```bash
cd apps/_repmax-import
git mv apps/web ../repmax-web
git mv apps/mobile ../repmax-mobile
git mv apps/server ../repmax-server
git mv packages/shared ../../packages/repmax-schema
git mv design ../../docs/repmax/design
git mv docs ../../docs/repmax/legacy-docs
git mv supabase/migrations ../../docs/repmax/legacy-supabase-migrations   # referencia, no se aplica
cd ../..
rm -rf apps/_repmax-import
```

Renombrar paquetes internos: `@repmax/shared` → `@repmax/repmax-schema` en todos los `package.json` e imports (`apps/repmax-web`, `apps/repmax-mobile`, `apps/repmax-server`).

## Paso 3 — Adaptar a convenciones del monorepo

- `package.json` raíz de cada app: quitar `packageManager: yarn` heredado, dejar que herede el `pnpm@11.15.1` del root de zm-tech.
- Agregar `apps/repmax-web`, `apps/repmax-mobile`, `apps/repmax-server`, `packages/repmax-schema` al `pnpm-workspace.yaml`.
- Agregar scripts al `package.json` raíz de zm-tech, mismo patrón que `dev:odental`:
  ```json
  "dev:repmax": "turbo run dev --filter=repmax-web",
  "dev:repmax:web": "pnpm --filter repmax-web dev",
  "dev:repmax:mobile": "pnpm --filter repmax-mobile dev",
  "dev:repmax:server": "pnpm --filter repmax-server dev"
  ```
- `yarn.lock` → borrar, generar `pnpm install` desde la raíz del monorepo.

**Checkpoint 1:** `pnpm install` corre limpio desde la raíz, `pnpm --filter repmax-web dev` levanta. Si algo rompe acá, es problema de merge/estructura — todavía no tocaste versiones. Arréglalo antes de seguir.

---

## Paso 4 — Alineación de versiones (recién ahora)

Subir en este orden (cada uno con su propio commit, para poder revertir sin arrastrar los demás):

### 4.1 — TypeScript 5.9.3 → 6.0.3

```bash
pnpm --filter repmax-web --filter repmax-mobile --filter repmax-server --filter repmax-schema add -D typescript@~6.0.3
pnpm --filter repmax-web --filter repmax-mobile --filter repmax-server --filter repmax-schema exec tsc --noEmit
```

Revisar breaking changes de TS 6 contra el código existente (principalmente: cambios en inferencia de tipos con `strict`, que RepMAX ya tiene activado según su `CLAUDE.md`).

### 4.2 — Expo 54 → 56 (en `apps/repmax-mobile`)

```bash
cd apps/repmax-mobile
pnpm dlx expo-doctor   # diagnóstico antes de tocar nada
pnpm dlx expo install expo@~56.0.16 --fix
```

Esto arrastra automáticamente el bump correcto de `expo-*` packages a sus versiones `~56.x` compatibles. **No fijar versiones de `expo-*` a mano** — dejar que `expo install --fix` resuelva el árbol.

### 4.3 — React 19.1.0 → 19.2.3, React Native 0.81.5 → 0.85.3

Viene incluido en el bump de Expo SDK 56 (Expo fija las versiones de RN/React compatibles por SDK). Verificar después del paso 4.2 que `package.json` quedó en `react: 19.2.3`, `react-native: 0.85.3`. Si `expo install --fix` no las movió, forzar manual y volver a correr `expo-doctor`.

### 4.4 — reanimated / worklets / screens / safe-area-context

Mismo criterio: dejar que `expo install --fix` los alinee a las versiones que exige SDK 56 (`reanimated 4.3.1`, `worklets 0.8.3`, `screens 4.25.2`, `safe-area-context ~5.7.0`). Estos paquetes tienen código nativo — **no los subas a mano sin pasar por `expo install`**, es la fuente más común de crashes silenciosos en dev builds.

### 4.5 — `apps/repmax-web` (Next.js) y `apps/repmax-server` (Express, temporal)

No requieren cambio de versión mayor — Next.js 15 ya está alineado con lo que usa `landing`/`odentalpro-web`. Solo actualizar `@types/react` a `~19.2.14` para consistencia.

**Checkpoint 2:** `pnpm build` desde la raíz pasa para los 3 apps de RepMAX. `expo-doctor` sin warnings. App mobile levanta en el emulador (WSL2 → Android vía `10.0.2.2` como ya hace RepMAX, o el patrón EAS que ya usas en geemastudio-mobile).

---

## Qué NO se hace en esta fase

- No tocar Supabase todavía — `apps/repmax-server` sigue hablando con su Postgres viejo o mockeado, o directamente queda sin `DATABASE_URL` válida hasta la fase 02. No es bloqueante: solo estás verificando que compila y las versiones son correctas.
- No borrar `apps/repmax-server` todavía, aunque se sepa que va a morir en la fase 03 — sirve de referencia de la lógica de negocio (cálculo de KPIs del dashboard, validaciones) que hay que replicar del lado de Supabase/RLS.
