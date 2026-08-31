# Plan 10 — Asistente de ventas por WhatsApp (WABA) para RepMAX

**Estado:** Diseño inicial, para prototipar en paralelo mientras avanza el
resto del roadmap. No es dependencia del cierre con el primer tenant (plan 09).
**Fuente:** patrón arquitectónico de `aeom0/ZM-Lash-and-Nails-Beauty`
(repo separado, no shared package — se porta el diseño, no el código tal cual).

---

## 1. Qué se reusa y qué NO

**Se reusa:** el patrón de arquitectura (Edge Function webhook → dispatcher →
handlers especializados → clasificación de intención → acciones sobre BD),
y las lecciones ya pagadas en producción.

**No se reusa directo:** el código en sí. ZM Lash vive en otro repo, con su
propio esquema de citas/servicios. Para RepMAX hay que escribir un
`whatsapp-webhook` nuevo dentro de `docs/repmax/supabase/functions/`,
adaptado a ventas/inventario en vez de agenda.

---

## 2. La lección que NO vamos a repetir

ZM Lash llegó a **44 puntos de decisión de intención** (regex/keyword),
muchos inline y sin nombre, causando bugs reales en producción por
clasificación frágil de texto libre (ver `auditoria-intenciones-waba.md`
del repo). La corrección en curso allá es:

- **Un solo llamado a Haiku por mensaje libre**, con un **enum acotado** de
  intents (no cascada de regex)
- **Grupo A** (clasifica texto libre → sí compite con el LLM): crear pedido,
  reclamo, confirmar, corregir carrito, etc.
- **Grupo B** (determinístico, NUNCA entra al LLM): ¿ya hay una venta abierta
  en esta sesión?, título de botón de plantilla, anti-eco de Meta, estado de
  sesión. Estas siguen siendo checks de código normal.

**Para RepMAX arrancamos directo en el patrón corregido — enum + Haiku desde
el primer commit, cero árbol de regex que crezca sin control.**

---

## 3. Mapeo de handlers: ZM Lash → RepMAX

| ZM Lash (agenda)                                                                   | RepMAX (ventas)                                                                                                                               | Prioridad                                        |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `ai-assistant.ts` (consulta libre)                                                 | Consulta de catálogo en lenguaje natural — "¿tenés pastillas de freno para Corolla 2015?" contra `repmax_products` + `repmax_vehicle_catalog` | Fase 1                                           |
| `menu.ts` (menú interactivo)                                                       | Menú: Ver catálogo / Consultar pedido / Hablar con vendedor                                                                                   | Fase 1                                           |
| `client-identity.ts`                                                               | Vincular número de WhatsApp a `repmax_customers`                                                                                              | Fase 1                                           |
| `staff-echo.ts` + `staff-resume.ts`                                                | Handoff humano — el cajero toma la conversación desde su WhatsApp, el bot se pausa                                                            | Fase 1 (crítico para negociar precio/pieza rara) |
| `booking-flow.ts` (agendar)                                                        | **Flujo de cotización/pedido**: arma carrito por chat → confirma → genera pre-venta vinculada a `repmax_sale_items`                           | Fase 2                                           |
| `payment.ts` + `payment-screenshot-detected.ts` + `payment-verification-button.ts` | Cliente manda captura de Pago Móvil/Zelle → botón para que el cajero la verifique → cierra la venta con `repmax_create_sale_with_items`       | Fase 3                                           |
| `cart-nudge`, `abandoned-cart-reminders`, `browse-reengage`                        | Reactivación: preguntó por una pieza y no cerró → seguimiento a las N horas                                                                   | Fase 4                                           |
| `silence-watchdog`                                                                 | Conversación estancada → alerta al vendedor                                                                                                   | Fase 4                                           |
| `chat-quality-review`                                                              | QA automatizado de respuestas del bot                                                                                                         | Fase 4                                           |
| `waba-pricing-sync`                                                                | Trackear costo por conversación que cobra Meta                                                                                                | Fase 3 (antes de escalar volumen)                |

---

## 4. Esquema de datos propuesto (nuevo, versionado en migrations)

```
repmax_wa_conversations   -- 1 fila por hilo activo (store_id, customer_id, phone, step, session_state jsonb)
repmax_wa_messages        -- log de mensajes entrantes/salientes (para auditoría y QA)
repmax_wa_intent_log      -- intent clasificado por mensaje libre (enum, confidence, handler_ejecutado)
repmax_wa_staff_sessions  -- qué vendedor tiene tomada una conversación (handoff)
```

Todo bajo prefijo `repmax_*`, RLS por `store_id` igual que el resto del
esquema. Va como migración versionada normal cuando se implemente — nada de
esto se toca hasta que arranque Fase 1 en serio.

---

## 5. Fase 0 — Lo que se puede prototipar YA (sin esperar nada de Meta)

Esto es lo que sí se puede adelantar en días, no semanas:

- WhatsApp Cloud API tiene un **modo sandbox/test**: número de prueba de
  Meta + hasta 5 destinatarios verificados manualmente, **sin necesidad de
  verificación de negocio**. Se puede tener un webhook funcionando y
  contestando consultas de catálogo en un par de días de trabajo con Cursor.
- Con eso alcanza para: `whatsapp-webhook` básico + intent classification
  (enum chico: `consultar_producto`, `saludo`, `hablar_con_vendedor`, `otro`)
  - consulta a `repmax_products` + respuesta con foto/precio.
- **Esto es interno/demo, no producción con el tenant real.** Sirve para
  validar el patrón y tener algo tangible que mostrar como "ya está
  caminando", pero no reemplaza la verificación de negocio real.

## 6. Lo que sí depende de un tercero (no es pesimismo, es un hecho operativo)

A diferencia de MLV (que está bloqueada sin fecha), la WhatsApp Business
Platform **sí funciona en Venezuela** — la diferencia real con MercadoLibre.
Pero igual hay un proceso real fuera de nuestro control directo:

- Verificación de negocio en Meta Business Manager (días, no hay botón para
  saltarlo)
- Aprobación de plantillas de mensaje (`HSM`) si se van a mandar mensajes
  fuera de la ventana de 24h (recordatorios, reactivación)
- Número de teléfono dedicado para WABA (no puede ser el mismo que ya usa
  el cliente en WhatsApp normal/Business App)

Esto corre en paralelo mientras se construye el código — no bloquea el
desarrollo, solo bloquea producción con el tenant real hasta que Meta
apruebe.

---

## 7. Fases de implementación

| Fase                      | Contenido                                                          | Bloqueada por Meta?                          |
| ------------------------- | ------------------------------------------------------------------ | -------------------------------------------- |
| **0 — Prototipo interno** | Webhook + consulta de catálogo + menú básico, en sandbox           | No                                           |
| **1 — MVP con handoff**   | + vincular cliente + handoff a vendedor humano                     | No para desarrollar; sí para producción real |
| **2 — Cotización/pedido** | Flujo tipo `booking-flow.ts` adaptado a carrito de venta           | No                                           |
| **3 — Pagos**             | Captura de pago + verificación + cierre de venta vía RPC existente | No                                           |
| **4 — Reactivación/QA**   | Nudges, silence-watchdog, chat-quality-review                      | No                                           |

**Nada de esto está bloqueado por código o por Cursor** — el único gate
externo real es la verificación de negocio de Meta para pasar de sandbox a
producción, y esa corre en paralelo sin frenar el desarrollo.

---

## 8. Próximos pasos concretos

1. Arrancar Fase 0 en sandbox esta semana (no depende de tener tenant real)
2. Alberto inicia verificación de negocio en Meta Business Manager en
   paralelo (proceso de ellos, no de código)
3. Definir el enum inicial de intents para RepMAX (versión chica, tipo el
   piloto de 5 intents que hizo ZM Lash, no las 44 desde el arranque)
4. Migración SQL de las 4 tablas nuevas (sección 4) cuando Fase 0 esté
   validada, vía MCP `apply_migration` como siempre
