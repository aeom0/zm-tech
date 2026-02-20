# Comparación IA Scout360 vs ZM Lash & Nails Beauty — Mejoras y diferenciación web/mobile

Documento de comparación entre ambos proyectos y sugerencias para reforzar la diferenciación entre producto web y producto móvil.

---

## 1. Resumen de estructuras

| Aspecto | IA Scout360 | ZM Lash & Nails Beauty |
|--------|-------------|-------------------------|
| **Tipo** | Monorepo (Yarn workspaces + Turbo) | Monorepo (npm workspaces) |
| **Web** | App dedicada: `apps/web` (Next.js 16) | App dedicada: `apps/web` (Next.js 15) — landing |
| **Mobile** | App dedicada: `apps/mobile` (Expo) | App dedicada: `apps/mobile` (Expo) |
| **Backend** | Supabase (BaaS) | Express + PostgreSQL (Drizzle) en raíz |
| **Compartido** | `packages/`: shared-types, shared-utils, shared-config, shared-ui | `packages/shared-schema` (@zm/shared-schema) |
| **Scripts** | `yarn web:dev`, `yarn mobile:dev`, `yarn build` (Turbo) | `npm run web:dev`, `npm run mobile:dev`, `npm run build` |

---

## 2. Diferenciación web vs mobile

### IA Scout360 (ya diferenciado por apps)

- **Web** = producto independiente (Next.js, SSR, SEO, Tailwind, dominio web).
- **Mobile** = producto independiente (Expo/RN, cámaras, sensores, instalable).
- Comparten tipos y utils vía `@scout360/shared-types` y `@scout360/shared-utils`.

Sugerencias para reforzar la diferenciación:

1. **Documentar en arquitectura cuándo tocar cada app**
   - Ej.: "Cambios de dominio/scouting → ambos; cambios de UI solo web o solo mobile; nuevos reportes web → apps/web".
2. **Scripts y nombres**
   - Mantener `web:dev` / `mobile:dev` y en la doc dejar claro: "web = navegador, mobile = Expo/device".
3. **Convención de carpetas por plataforma dentro de cada app**
   - En `apps/web`: ya está claro (Next.js).
   - En `apps/mobile`: si crece lógica solo-nativa, considerar `src/platform/` o archivos `.native.tsx` para no mezclar con código que en el futuro pudiera compartirse con web (p. ej. si un día usan Expo web).
4. **shared-ui**
   - Hoy está poco usado. Si añaden componentes compartidos (p. ej. formularios de prospecto, validaciones visuales), documentar en arquitectura que `@scout360/shared-ui` es para código que **realmente** se usa en web y mobile; si algo es solo web o solo mobile, dejarlo en la app correspondiente.

### ZM Lash & Nails Beauty (monorepo desde 2026-02)

- **Web** = app dedicada en `apps/web` (Next.js 15) — landing pública, SEO.
- **Mobile** = app dedicada en `apps/mobile` (Expo) — gestión del salón en iOS/Android.
- **Compartido**: `packages/shared-schema` (@zm/shared-schema) para schema Drizzle + Zod.
- El servidor Express queda en la raíz; web y mobile consumen la misma API.

Sugerencias para diferenciar más web de mobile:

1. **Documentar la estrategia en arquitectura**
   - Dejar explícito: "Un solo código cliente; web y mobile se diferencian por `Platform.OS`, breakpoints y archivos `.web.ts` / `.native.ts`."
2. **Carpetas o prefijos por plataforma**
   - Opción A: dentro de `client/`, agrupar variantes por plataforma, ej.:
     - `client/screens/` (común) + `client/screens/web/` o componentes `*.web.tsx` cuando la pantalla sea muy distinta en web.
   - Opción B: mantener estructura actual y seguir usando `Platform.select`, `useResponsive`, `.web.ts`; solo documentar el patrón en una regla (ej. `platform-patterns.mdc`).
3. **Naming en scripts y README**
   - Dejar claro: `expo:dev` = cliente (todas las plataformas), `web:build` = build web del mismo cliente, `server:dev` = API.
4. **Si en el futuro quieren una web muy distinta (SEO, landing, otra UX)**
   - Ahí tendría sentido valorar un monorepo tipo Scout: `apps/web` (Next.js o similar) + `apps/mobile` (Expo) + `packages/` con tipos y utils compartidos. No es necesario ahora si la web actual (Expo web) basta.

---

## 3. Mejoras sugeridas por proyecto

### IA Scout360

- **Hecho en esta pasada**: actualización de documentación a nombres reales de paquetes (`@scout360/shared-types`, `@scout360/shared-ui` en la estructura, import de ejemplo, reglas y CONTRIBUTING).
- **Opcional**: en `.cursor/rules/arquitectura.mdc` (o en una regla "when-to-touch-what") añadir un párrafo corto "Cuándo trabajar en web vs mobile" como en el punto 2 anterior.
- **shared-ui**: si sigue vacío o casi vacío, está bien; cuando añadan componentes compartidos, documentar en arquitectura el criterio (solo lo que usen ambas apps).

### ZM Lash & Nails Beauty

- **Documentar en arquitectura** la decisión "un cliente, múltiples plataformas" y los patrones: `Platform.OS`, `useResponsive`, `.web.ts` / `.native.ts`.
- **Opcional**: regla corta `platform-patterns.mdc` con: cuándo usar `Platform.select`, cuándo `useResponsive`, cuándo archivos por plataforma; y que la "web" es el target web de Expo, no una app separada.
- **Estructura**: mantener `client/` + `server/` + `shared/`; no hace falta pasar a monorepo a menos que añadan una segunda app (p. ej. panel admin o landing en Next.js).

---

## 4. Tabla comparativa de "dónde vive cada cosa"

| Concepto | IA Scout360 | ZM Lash & Nails Beauty |
|----------|-------------|-------------------------|
| Tipos compartidos | `packages/shared-types` | `shared/schema.ts` (Drizzle + Zod) |
| Utils compartidos | `packages/shared-utils` | Dentro de `client/` o `server/` según aplique |
| Config (ESLint, TS, Prettier) | `packages/shared-config` | Raíz del repo |
| UI compartida | `packages/shared-ui` (reservado) | No; todo en `client/` |
| Diferenciación web/mobile | Por **app** (web vs mobile) | Por **plataforma** en el mismo cliente (web vs native) |

---

## 5. Conclusión

- **IA Scout360**: ya diferencia bien web y mobile con dos apps y packages compartidos; las actualizaciones de documentación y el criterio para `shared-ui` refuerzan esa separación.
- **ZM Lash & Nails Beauty**: la diferenciación es por plataforma dentro de un solo cliente; conviene documentarla en arquitectura y, si quieren, en una regla de patrones (platform/breakpoints) para que "diferenciar web de mobile" quede claro y consistente.

Si en ZM más adelante necesitan una web con stack distinto (p. ej. Next.js) o una app admin separada, la evolución natural sería un monorepo al estilo IA Scout360 (`apps/web`, `apps/mobile`, `packages/*`). Mientras la web sea la exportación web de Expo, la estructura actual es coherente y solo mejora con documentación explícita.
