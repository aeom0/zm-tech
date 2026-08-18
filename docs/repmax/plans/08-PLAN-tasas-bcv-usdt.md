# 08 — Tasas BCV/USDT en vivo (POS)

> **Estado: implementado** (ago 2026) — paquete compartido `@zmtech/tasas`, tablas `hub_tasas_bcv` / `hub_tasas_usdt` **aplicadas en producción**, endpoints en `repmax-web`, cron Vercel y checkout web + mobile consumiendo la tasa BCV en vivo con fallback a tasa manual. Alcance: `packages/tasas`, `apps/repmax-web`, `apps/repmax-mobile`.

**Objetivo:** reemplazar la tasa fija `repmax_stores.usd_bs_rate = 36.50` (editada a mano) por una tasa BCV oficial en vivo en el checkout, manteniendo el override manual como red de seguridad, y dejando la lógica como **paquete compartido** reutilizable por OdentalPro/GeemaStudio a futuro.

---

## 1. Problema

RepMAX solo tenía una tasa manual sin fuente real ni distinción BCV/paralelo. El owner debía actualizarla a mano en Mi tienda; si se olvidaba, el checkout cobraba con una tasa vieja. `zetaeme-enterprise-suite` ya resuelve esto (BCV + USDT/Binance, spread, fallback, cron) — se porta esa lógica en vez de reinventarla, adaptada a las convenciones de `zm-tech` (paquete workspace sin build, prefijo `hub_`, sin Cotizave/Telegram/pg_cron).

## 2. Paquete compartido `@zmtech/tasas`

`packages/tasas/` — mismo patrón que los demás packages del monorepo (`main`/`exports` apuntan a `.ts` directo, sin paso de build):

```
packages/tasas/
  package.json              # exports: "." (client-safe) y "./server" (Node-only)
  src/
    types.ts                 # TasaIndividual, SpreadInfo, NivelSpread, TasasDuales,
                              # AnalisisMargen, PrecioSugeridoResult, NivelAlertaMargen
    spread.ts                 # calcularSpreadInfo(bcv, usdt) — niveles bajo <10% / medio 10-20% / alto 20-35% / critico >35%
    calcularMargen.ts         # calcularMargenReal / calcularPrecioSugerido — funciones puras, sin caller aún (ver §6)
    logicaBCV.ts               # ahoraVenezuela(), obtenerFechaReferenciaBCV(), feriados bancarios VE
    hooks/useTasasDuales.ts    # hook WEB-only ('use client'): fetch a /api/bcv/tasa + cache localStorage 30min
    index.ts                   # barrel client-safe (tipos + spread + logicaBCV + hook web)
    server/
      bcvProviders.ts          # obtenerTasaDesdeProveedores() — bcv.today, timeout 8s
      usdtProviders.ts         # obtenerTasaUsdt() — usdt.com.ve, promedia buy/sell
      bcvTasaResolver.ts        # resolverTasaBcvOperacion(repo) — fila exacta → última ≤fecha → emergencia
      bcvRepositorioFactory.ts / usdtRepositorioFactory.ts  # crearRepositorioTasas{Bcv,Usdt}(clienteMinimo)
      index.ts                  # barrel server-only (subpath "@zmtech/tasas/server")
```

Reglas de import: `repmax-web` importa `@zmtech/tasas` (client) y `@zmtech/tasas/server` (solo en Route Handlers). `repmax-mobile` **solo** importa `@zmtech/tasas` (tipos + `spread.ts` + `logicaBCV.ts`) — nunca `/server` (usa `fetch`/Node timers no disponibles igual en RN, y no debe tener el service-role key) ni el hook web (usa `localStorage`). Mobile trae su propio hook con `AsyncStorage` (§4).

Diferencias deliberadas frente a `zetaeme-enterprise-suite`:

- Sin Cotizave (fuente USDT paga) — solo `usdt.com.ve` (gratis, sin key).
- BCV solo desde `bcv.today` en esta fase — `bcv-divisas` (scraping HTML) queda documentado como fuente futura, no implementado.
- Tablas con prefijo `hub_` (no sin prefijo) — consistente con `docs/hub/supabase/migrations/`.
- Sin pg_cron — solo Vercel Cron.
- Sin alertas Telegram/email de spread crítico.
- Sin margen real por producto todavía (`repmax_products` no tiene campo de costo).

## 3. Tablas Supabase (aplicadas en producción, `llacowjutjfefboqgfnj`)

`docs/hub/supabase/migrations/20260818120000_hub_tasas_cambio.sql` — **aplicada 2026-08-18**:

- `hub_tasas_bcv(id, fecha date unique, usd numeric(10,4) check > 0, fuente text check in ('bcv-oficial','bcv-today','manual','emergencia','fin-de-semana'), es_manual bool, es_fin_de_semana bool, notas, created_at, updated_at)`
- `hub_tasas_usdt(id, fecha date, mercado text default 'binance', usd numeric(10,4) check > 0, buy_rate, sell_rate, fuente text default 'usdt.com.ve', notas, created_at, unique(fecha, mercado))`
- RLS: `SELECT` público (`using (true)`) en ambas — leídas sin sesión por `/api/bcv/tasa` y por mobile directo. Sin política de `INSERT`/`UPDATE` para `anon`/`authenticated` — solo `service_role` (cron) escribe, bypassea RLS por defecto.
- Estas dos tablas son las **únicas** piezas de `hub_*` aplicadas hasta ahora; el resto del schema del Hub interno sigue en borrador (ver [docs/hub/README.md](../../hub/README.md)).

`docs/repmax/supabase/migrations/20260818130000_repmax_stores_tasa_manual.sql` — **aplicada 2026-08-18**: agrega `repmax_stores.usar_tasa_manual boolean not null default false`. Reflejado en `packages/repmax-schema/src/schema.ts`.

## 4. Endpoints en `apps/repmax-web`

Primer uso de `app/api/` en `repmax-web`:

- `src/lib/supabase/admin.ts` — cliente `service_role` (`createAdminClient()`), nuevo — requiere `SUPABASE_SERVICE_ROLE_KEY` en `.env.local` / Vercel (secreto).
- `src/app/api/bcv/tasa/route.ts` — `GET` público: `resolverTasaBcvOperacion()` + última fila de `hub_tasas_usdt` + `calcularSpreadInfo()` → `{ bcv, usdt, spread, timestamp, aviso }`. Lo consume el hook web y mobile (fetch directo a Supabase, no a este endpoint — ver §5).
- `src/app/api/cron/guardar-tasa-bcv-diario/route.ts` y `.../guardar-tasa-usdt-diario/route.ts` — `GET`, valida `Authorization: Bearer ${CRON_SECRET}`, llaman a los providers y hacen upsert (`onConflict: 'fecha'` / `'fecha,mercado'`) vía `supabaseAdmin`.
- `apps/repmax-web/vercel.json` — `crons`: BCV `30 4 * * *`, USDT `35 4 * * *` (hora UTC). Requiere `CRON_SECRET` (Vercel, secreto).

Nota técnica: los call sites castean el cliente a `any` al pasarlo a `crearRepositorioTasas{Bcv,Usdt}` para evitar `TS2589` (inferencia de tipos de Supabase demasiado profunda) — el paquete mantiene sus tipos propios sin diluirlos.

## 5. Integración en el POS

**Web** — `AuthContext.tsx` (`loadMembership()`): además de `usd_bs_rate`, lee `usar_tasa_manual` y resuelve `resolverTasaEfectiva()` — si `usar_tasa_manual` usa el valor manual tal cual; si no, hace fetch a `/api/bcv/tasa` y usa `bcv.valor`, con fallback silencioso al manual si falla o no hay dato. Firma de `StoreWeb` y de componentes downstream (`CheckoutSheet.tsx`, etc.) sin cambios.

**Mobile** — nuevo hook `src/hooks/useTasaCambio.ts`: lee `hub_tasas_bcv`/`hub_tasas_usdt` **directo por Supabase** (no vía la API de `repmax-web`, para no depender de un env var nuevo con el origen del deploy web), cachea en `AsyncStorage` 30 min, misma lógica manual-vs-vivo. `saleService.ts`: se quita el fallback hardcodeado `?? 36.50` de `p_usd_bs_rate` — el caller siempre pasa un valor resuelto. `PaymentScreen.tsx` usa `usdBsRateEfectivo` del hook. `ExchangeRateScreen.tsx` gana un switch "Usar tasa manual" (habilita el `TextInput` existente) y una card "BCV vs USDT (en vivo)" con fecha/fuente/spread, reemplazando el texto estático de fuentes. `AuthContext.tsx` mobile (`mapStore`/`updateStore`) persiste `usar_tasa_manual`.

`repmax_sales.usd_bs_rate` no cambia de esquema — sigue guardando el snapshot de la tasa efectivamente usada en la venta, ahora resuelta desde BCV en vivo o manual según el switch de la tienda.

## 6. Fuera de alcance en esta fase (explícito)

- **Margen real por producto** — `calcularMargenReal`/`calcularPrecioSugerido` quedan exportados sin caller; requiere agregar costo a `repmax_products` (cambio de esquema de producto, no de tasas).
- Alertas de spread crítico (Telegram/email).
- `bcv-divisas` (scraping HTML) como fuente adicional de BCV.
- Cotizave (fuente USDT paga).
- pg_cron (solo Vercel Cron).
- Adopción en OdentalPro/GeemaStudio/Landing — el paquete queda listo para ellos, no se cablea todavía.

## 7. Verificación hecha

- `packages/tasas`: `tsc --noEmit` limpio; script ad-hoc contra `bcv.today` y `usdt.com.ve` reales.
- `repmax-web`: `pnpm dev` + `curl localhost:3003/api/bcv/tasa` con las tablas ya aplicadas en producción — respuesta con BCV/USDT/spread reales verificada end-to-end (cron → tablas → resolver → endpoint).
- `repmax-mobile`: `tsc` limpio en los archivos tocados; **no probado visualmente** (sin simulador/dispositivo Expo disponible en este entorno) — pendiente de una pasada manual en Expo antes de dar por cerrado el flujo mobile.

## 8. Preguntas abiertas / próximos pasos

- ¿Vale la pena una función de limpieza para `hub_tasas_bcv`/`hub_tasas_usdt` si el volumen crece? Hoy es 1 fila/día por tabla, no urgente.
- Confirmar visualmente en Expo el switch de `ExchangeRateScreen` y el checkout con tasa en vivo antes de considerarlo terminado en mobile.
- Definir si/cuándo se agrega costo a `repmax_products` para activar margen real.
