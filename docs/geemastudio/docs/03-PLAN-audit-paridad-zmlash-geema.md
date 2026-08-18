# Plan 03 — Audit de paridad: ZM Lash & Nails (real) vs GeemaStudio (multi-tenant)

> Documento de contexto técnico para Cursor / Claude Code. Léelo completo antes de tocar cualquier archivo. Este es un **audit de solo lectura** — no se espera ni se permite ningún cambio de código en esta tarea.

**Fecha:** 2026-08-07
**Autor del plan:** Alberto Orta (Founder & CTO, ZM Tech)
**Depende de:** Nada bloqueante. Es trabajo paralelo (ver §7 de `02-PLAN-retrofit-tenant-id.md`). Plan 02 (A+B+C) ya está cerrado en producción, pero este audit no depende de eso.

---

## 1. Qué problema resuelve esto

`ZM-Lash-and-Nails-Beauty` es la app real, en producción, con clientas y citas activas todos los días — construida rápido para resolver el negocio de Vanessa. `GeemaStudio` (`apps/geemastudio-web`, `geemastudio-mobile`, `geemastudio-server` dentro de `zm-tech`) es la versión **productizable, multi-tenant** de esa misma idea, pensada para vender a otros salones.

La pregunta que este audit responde: **¿todo lo que ya funciona en ZM Lash existe también en Geema?** Cualquier feature que exista en ZM Lash y no en Geema es una brecha real de producto — no una idea, una brecha, porque ya está validada con uso real.

No es al revés: no estamos buscando qué le sobra a Geema. ZM Lash es la referencia funcional; Geema es lo que hay que llevar a ese nivel.

---

## 2. Repos y paths exactos a comparar

| Lado                     | Repo                             | Path local (WSL)                       | Apps dentro                                                                  |
| ------------------------ | -------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------- |
| **Referencia (ZM Lash)** | `aeom0/ZM-Lash-and-Nails-Beauty` | `/home/alber/ZM-Lash-and-Nails-Beauty` | web + mobile (monolito de un solo tenant)                                    |
| **Producto (Geema)**     | `aeom0/zm-tech`                  | `/home/alber/zm-tech`                  | `apps/geemastudio-web`, `apps/geemastudio-mobile`, `apps/geemastudio-server` |

No compares contra el repo legacy `aeom0/geemastudio` (SalonPro) — ese quedó absorbido, el desarrollo activo vive en `zm-tech`.

---

## 3. Áreas funcionales a auditar (una fila de la matriz por cada una)

Usa esta lista como punto de partida, pero si encuentras un módulo real en ZM Lash que no está aquí, agrégalo — la lista no es cerrada:

1. **Agenda / citas** (booking, calendario, disponibilidad, recordatorios)
2. **Servicios** (catálogo, categorías, precios, duración)
3. **Inventario** (productos, stock, alertas de bajo stock)
4. **Finanzas** (ingresos, gastos, reportes, cierre de caja)
5. **Comisiones** (cálculo, reglas por empleada, reportes)
6. **Bot WhatsApp (WABA)** (reservas, recordatorios, intents, IA)
7. **Promociones** (broadcast, promo items, vigencia)
8. **Packs** (paquetes de servicios combinados)
9. **Portafolio / galería** (`service_portfolio_images` — fotos de trabajos)
10. **Push notifications** (`push_tokens`, triggers)
11. **Feriados / holidays** del salón
12. **Roles y permisos** (`dev` / `owner` / `staff`)
13. **Onboarding** (flujo de setup inicial)

---

## 4. Cómo verificar cada feature (nivel de rigor exigido)

**No infieras por nombre de archivo o carpeta.** El estándar de este proyecto es verification-first: abre el componente/ruta real, confirma que la lógica está conectada de punta a punta (UI → hook/servicio → Supabase), no solo que "existe un archivo que suena parecido".

Para cada feature de la lista, en cada lado (ZM Lash / Geema), clasifica en una de estas 4 categorías — no uses solo ✅/❌:

- **`✅ Completo`** — implementado y conectado a datos reales, se puede usar hoy
- **`🟡 Parcial`** — existe UI o lógica pero incompleta, hardcodeada, o sin conectar a Supabase
- **`❌ No existe`** — no hay rastro de esto en el código
- **`❓ No verificable`** — encontraste algo pero no pudiste confirmar si funciona sin correr la app (dilo explícitamente, no adivines)

Para features de Geema en particular: recuerda que es multi-tenant, así que verifica que lo que exista respete el patrón de tenant scoping (no algo que hardcodee `zm-lash-nails`).

---

## 5. Qué NO hacer

- **No modifiques código en ninguno de los dos repos.** Este es un audit de lectura pura.
- **No corras migraciones ni toques Supabase.**
- No asumas que "si no está en el código, está en el roadmap" — si algo no existe, repórtalo como `❌ No existe`, punto.
- No mezcles esto con el trabajo de RLS/tenant_id del Plan 02 — son hilos independientes.

---

## 6. Output esperado

Un solo documento markdown: `docs/audit/03-AUDIT-paridad-zmlash-geema.md` (dentro de `zm-tech`, ya que Geema vive ahí).

### 6.1 Tabla principal

| Feature        | ZM Lash (referencia) | Geema Web | Geema Mobile | Geema Server | Notas |
| -------------- | -------------------- | --------- | ------------ | ------------ | ----- |
| Agenda / citas | ✅                   | 🟡        | ❌           | ✅           | ...   |
| ...            |                      |           |              |              |       |

### 6.2 Sección "Gaps críticos" (la parte que más me importa)

No me entregues solo la tabla plana — necesito una lista **priorizada** de los gaps que bloquean vender Geema a un segundo tenant. Para cada gap crítico:

- Qué falta exactamente (con ruta de archivo de referencia en ZM Lash si aplica)
- Por qué es crítico (¿bloquea onboarding de un tenant nuevo? ¿es cosmético? ¿es solo para Vanessa específicamente y no debería ni portarse?)
- Estimado grosero de esfuerzo (S/M/L, sin comprometerte a horas)

### 6.3 Sección "No portar" (igual de importante)

Cosas que existen en ZM Lash pero que son específicas del negocio de Vanessa (branding, textos hardcodeados en español-Perú, número de WABA específico, moneda `S/`) y que **no deberían** copiarse tal cual a Geema — deben generalizarse o quedarse fuera. Esto evita que alguien copie-pegue algo que no debía ser multi-tenant.

---

## 7. Contexto que ya tienes (no lo repitas, pero úsalo)

- ZM Lash: React Native 0.81 + Expo SDK 54 + React 19 + Next.js 15, Supabase `udelxwwnyivknslueerr`, moneda `S/`, equipo Vanessa/Stephani/Yosaida/Romina.
- Geema: dentro de monorepo `zm-tech`, Turborepo + pnpm, Next.js + Expo SDK 56 + React 19.2.3, `@geemastudio/tenant-config` con presets por tipo de negocio (spa de uñas, barbería, salón de cabello, estética completa).
- Plan 02 (retrofit `tenant_id`) ya cerrado end-to-end en producción — la base de ZM Lash ya tiene `tenant_id` y RLS filtrando por tenant. Esto es relevante solo como contexto de que la infraestructura multi-tenant en DB ya existe; este audit es sobre **código de features**, no sobre la base de datos.

---

## 8. Al terminar

Entrega el markdown y un resumen de 5-8 líneas en el chat con: cuántos gaps críticos encontraste, cuál es el más grande, y tu recomendación de por dónde empezar. Alberto revisa esto en Claude Desktop antes de planear cualquier sprint de desarrollo sobre Geema.
