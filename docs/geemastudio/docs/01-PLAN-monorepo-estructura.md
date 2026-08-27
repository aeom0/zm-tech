# Plan 01 — Reestructuración a monorepo `zm-tech`

> **Nota de proveniencia (agregada 27-ago-2026):** este documento es un draft local del 22-jul-2026 que nunca se había subido a ningún repositorio — se recuperó de un archivo en Descargas. Se espeja aquí siguiendo el mismo patrón que `02-PLAN-retrofit-tenant-id.md` y `03-PLAN-audit-paridad-zmlash-geema.md` (fuente canónica en `aeom0/ZM-Lash-and-Nails-Beauty/docs/plans/`). Describe la fusión de `aeom0/ZMTech` (landing) + `aeom0/geemastudio` en este mismo monorepo — ya ejecutada; este archivo queda como registro histórico del plan original.
>
> No confundir con `MONOREPO_MIGRACION.md` de este mismo directorio, que documenta una migración **distinta y anterior**: separar el código único de ZM Lash & Nails en `apps/web` + `apps/mobile` + `server` (npm workspaces), sin relación con la fusión landing+geemastudio ni con pnpm/Turborepo.

## Estado actual verificado (22 julio 2026)

**`aeom0/ZMTech`** (Landing):
- Next.js App Router, plano en la raíz (`src/`, `public/`, `next.config.ts`, etc.)
- Ya migrado a `pnpm` + TypeScript 6, `pnpm-workspace.yaml` explícitamente marcado "no es un monorepo, solo settings"
- Supabase propio (`llacowjutjfefboqgfnj`), una sola tabla `contacts`, sin relación con GeemaStudio

**`aeom0/geemastudio`** (Beauty vertical, multi-tenant por diseño):
- Turborepo real: `apps/mobile` (Expo SDK 56, RN 0.85.3, React 19.2.3), `apps/web`, `packages/tenant-config`, `packages/shared-schema` (Drizzle + Zod), `server/`
- Ya migrado de Yarn 4 a pnpm 10.12.4, TS 6.0.3
- `.npmrc` con `node-linker=hoisted` + `shamefully-hoist=true` (decisión consciente para compatibilidad Metro)
- `metro.config.js` usa `getDefaultConfig` de `expo/metro-config` + `watchFolders`/`nodeModulesPaths` explícitos — correcto
- `drizzle.config.ts` en la raíz: `schema: "./packages/shared-schema/src/schema.ts"`, `out: "./migrations"`
- Su propio proyecto Supabase (`xidjomlxpuosupymcsaj`) se perdió por inactividad — **irrelevante para datos, GeemaStudio va a leer del proyecto de ZM Lash & Nails** (ver Plan 02)

## Estructura destino

```
zm-tech/
├── apps/
│   ├── landing/                      ← contenido íntegro de ZMTech hoy
│   ├── geemastudio-web/              ← geemastudio/apps/web
│   ├── geemastudio-mobile/           ← geemastudio/apps/mobile
│   └── geemastudio-server/           ← geemastudio/server + supabase/ + migrations/ + drizzle.config.ts + scripts/db/
├── packages/
│   ├── tenant-config/                ← geemastudio/packages/tenant-config (scope @geemastudio/* sin cambiar por ahora)
│   └── shared-schema/                ← geemastudio/packages/shared-schema
├── docs/
│   ├── landing/                      ← docs/ + CLAUDE.md actuales de ZMTech
│   └── geemastudio/                  ← README, ROADMAP, CHANGELOG, ZM_KNOWLEDGE_FOR_GEEMASTUDIO, design/, docs/
├── pnpm-workspace.yaml
├── pnpm-lock.yaml                    (uno solo, regenerado desde cero)
├── package.json                      (root, solo orquestación)
├── turbo.json
└── .npmrc                            (hereda hoisted de geemastudio)
```

## Fase 1 — Landing entra a `apps/landing`

Primero: en GitHub, **Settings → Repository name → `zm-tech`** (redirige la URL vieja automáticamente).

```bash
cd ~/ruta/a/ZMTech
mkdir -p apps/landing docs/landing

git mv src apps/landing/src
git mv public apps/landing/public
git mv next.config.ts apps/landing/next.config.ts
git mv tsconfig.json apps/landing/tsconfig.json
git mv eslint.config.mjs apps/landing/eslint.config.mjs
git mv postcss.config.mjs apps/landing/postcss.config.mjs
git mv components.json apps/landing/components.json
git mv .env.example apps/landing/.env.example
git mv package.json apps/landing/package.json
git mv docs/* docs/landing/ 2>/dev/null; rmdir docs 2>/dev/null
git mv CLAUDE.md docs/landing/CLAUDE.md
git mv zm-tech-landing.code-workspace apps/landing/landing.code-workspace

git commit -m "refactor: mover landing a apps/landing dentro del monorepo zm-tech"
```

## Fase 2 — Traer GeemaStudio preservando su historia de git

```bash
git remote add geemastudio git@github.com:aeom0/geemastudio.git
git fetch geemastudio
git merge -s ours --no-commit --allow-unrelated-histories geemastudio/main
git read-tree --prefix=temp-geema/ -u geemastudio/main
git commit -m "chore: importar geemastudio con historia completa"
```

## Fase 3 — Aplanar dentro del monorepo

```bash
mkdir -p docs/geemastudio

git mv temp-geema/apps/web apps/geemastudio-web
git mv temp-geema/apps/mobile apps/geemastudio-mobile
git mv temp-geema/server apps/geemastudio-server
git mv temp-geema/supabase apps/geemastudio-server/supabase
git mv temp-geema/migrations apps/geemastudio-server/migrations
git mv temp-geema/drizzle.config.ts apps/geemastudio-server/drizzle.config.ts
git mv temp-geema/scripts apps/geemastudio-server/scripts
git mv temp-geema/packages/tenant-config packages/tenant-config
git mv temp-geema/packages/shared-schema packages/shared-schema
git mv temp-geema/design docs/geemastudio/design
git mv temp-geema/docs docs/geemastudio/docs
git mv temp-geema/README.md docs/geemastudio/README.md
git mv temp-geema/CLAUDE.md docs/geemastudio/CLAUDE.md
git mv temp-geema/ROADMAP.md docs/geemastudio/ROADMAP.md
git mv temp-geema/CHANGELOG.md docs/geemastudio/CHANGELOG.md
git mv temp-geema/ZM_KNOWLEDGE_FOR_GEEMASTUDIO.md docs/geemastudio/ZM_KNOWLEDGE.md

rm -rf temp-geema
git commit -m "refactor: aplanar geemastudio dentro del monorepo zm-tech"
```

### ⚠️ Fix obligatorio post-move: rutas de `drizzle.config.ts`

```diff
# apps/geemastudio-server/drizzle.config.ts
- schema: "./packages/shared-schema/src/schema.ts",
+ schema: "../../packages/shared-schema/src/schema.ts",
  out: "./migrations",   // esta queda igual, migrations viajó junto
```

Revisar también cualquier import relativo dentro de `server/` que apuntara a `../packages/...` — ahora es `../../packages/...` (un nivel más de profundidad por estar dentro de `apps/`).

## Fase 4 — Archivos raíz nuevos

**`pnpm-workspace.yaml`**:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**`.npmrc`** (raíz, hereda config de geemastudio — no afecta a landing, no le hace daño):
```
node-linker=hoisted
shamefully-hoist=true
auto-install-peers=true
strict-peer-dependencies=false
```

**`turbo.json`** (base, ajustar pipelines según scripts reales de cada app):
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": {},
    "check:types": {}
  }
}
```

Luego: borrar `pnpm-lock.yaml` sueltos dentro de `apps/*`, correr `pnpm install` desde la raíz para generar un único lockfile, y validar:

```bash
pnpm --filter landing dev
pnpm --filter geemastudio-mobile dev
pnpm --filter geemastudio-web dev
```

## Configuración de deploys (después de que todo compile local)

- **Vercel**: dos proyectos apuntando al mismo repo — Root Directory `apps/landing` y `apps/geemastudio-web` respectivamente.
- **EAS (mobile)**: `eas.json` dentro de `apps/geemastudio-mobile` necesita confirmarse que el build corre con `cwd` correcto si se invoca desde la raíz del monorepo.
