# Plan: agente de soporte de ZM Tech por WhatsApp (Haiku 5.5)

Estado: borrador (16-oct-2026). Alcance inicial: tenants de GeemaStudio (proyecto `udelx…`).
OdentalPro y RepMAX quedan fuera hasta que el agente esté estable con Geema.

## Objetivo

Un número de WhatsApp de soporte **solo para GeemaStudio** (decidido el 16-oct-2026) donde
dueños y personal de los salones escriben sus dudas
y problemas de la plataforma. Un agente Haiku 5.5 con herramientas resuelve lo que puede y
escala el resto con el caso ya diagnosticado. Mismo principio que el agente de ZM Lash
([`plan-cutover-agente-haiku.md`](plan-cutover-agente-haiku.md)): **Haiku decide, el código
ejecuta y valida**.

No reemplaza al agente de reservas de cada salón. Son dos agentes con números, prompts y
herramientas distintos que comparten infraestructura.

## Qué resuelve, por nivel

| Nivel | Ejemplos | Herramientas |
|---|---|---|
| 1. Dudas de uso | Cómo agregar un servicio, conectar WhatsApp, qué incluye el plan | `ver_guia` (solo lectura de la guía) |
| 2. Diagnóstico de su cuenta | Correo sin confirmar, onboarding incompleto, número de WhatsApp desconectado, bot en pausa | `ver_estado_cuenta`, `ver_estado_whatsapp` (solo lectura, un tenant) |
| 3. Acciones seguras | Reenviar código de verificación, enviar código de recuperación, reactivar el bot | Acciones reversibles con confirmación explícita |
| 4. Escalar | Bugs, cobros, reembolsos, borrar datos, todo lo ambiguo | `escalar_a_humano` → ticket con resumen y diagnóstico |

Fuera de alcance para el modelo: dinero, cambios de plan, borrar datos, ver otro tenant,
cambios de configuración no listados en el nivel 3.

## Arquitectura

### Edge Function aparte: `support-webhook`

No se agrega como un tenant más de `whatsapp-webhook`:

- No arriesga el bot de ZM Lash en producción.
- El webhook actual resuelve el tenant por `phone_number_id` (`lib/tenant-resolver.ts`) y todo
  corre dentro de `runWithRequestTenantId`. En soporte, el tenant sale de **quién escribe**,
  no del número que recibe el mensaje.

Función nueva = entrada nueva en la matriz de `.github/workflows/edge-functions.yml` (el
guard de inventario falla si falta).

### Qué se reutiliza

El cliente Messages vive en `supabase/functions/_shared/agent/anthropic.ts`
(`callMessagesApi`, hecho el 16-oct-2026): recibe la API key y un callback de error
como parámetros. `whatsapp-webhook/agent/anthropic.ts` quedó como envoltura con la misma
firma de antes (`ANTHROPIC_API_KEY` + aviso de crédito agotado), así que ZM Lash no cambia.

El ciclo de `agent.ts` y el historial (`history.ts`) **no** se comparten: están atados a
las reservas (pasos de sesión, `wa_messages`, guardas de reembolso y de reserva inventada,
aviso al staff en pago). `support-webhook` tiene su propio ciclo corto sobre
`callMessagesApi` y su historial en `support_messages`. Las 16 herramientas de reservas
(`tools.ts`) y el prompt del salón (`prompt.ts`) se quedan en `whatsapp-webhook`.

Decidido en F1 (16-oct-2026):

- **Firma de Meta**: `_shared/meta-signature.ts` (HMAC-SHA256 del body crudo con el App
  Secret, header `X-Hub-Signature-256`). `support-webhook` rechaza con 401 si falta o no
  coincide. `whatsapp-webhook` todavía no valida la firma; puede adoptar el mismo módulo.
- **Dedupe y ráfagas**: no se mueve `inbound-gate.ts` (está atado a `wa_messages`,
  `wa_action_debounce` y al tenant del salón). Soporte usa algo más simple en
  `support-webhook/store.ts`: `wamid` UNIQUE en `support_messages` y "el último mensaje
  gana" (cada webhook espera 4 s y solo responde si su mensaje sigue siendo el último
  entrante; antes de enviar vuelve a mirar). Los escalamientos repetidos en 30 min
  actualizan el ticket abierto en vez de crear otro.
- **Fallas**: dos intentos del agente; si ambos fallan se registra el ticket y el usuario
  recibe el número de caso y el aviso de horario. Tope anti-abuso: 30 respuestas por
  teléfono por hora.

### API key de Anthropic

ZM Tech usa **su propia key** (cuenta de Anthropic de Alberto), separada de la de ZM Lash:

- Secret nuevo en `udelx…`: `ZMTECH_ANTHROPIC_API_KEY`. Lo configura Alberto con
  `supabase secrets set` o desde el dashboard; la key no va al repo ni al chat.
- `support-webhook` solo lee ese secret, y `whatsapp-webhook` sigue con `ANTHROPIC_API_KEY`.
  Si una cuenta se queda sin crédito, la otra no se cae.
- Estado de crédito por cuenta en `_shared/agent/anthropic-credit.ts` (hecho en F1):
  ZM Lash conserva `anthropic_wallet_usd` y `anthropic_api_status`; ZM Tech usa
  `zmtech_anthropic_wallet_usd` y `zmtech_anthropic_api_status`. El uso de tokens de
  soporte se guarda en `support_messages` (no en `ai_usage_log`, que es el costo del salón).
  Pendiente: `sync-anthropic-billing` sigue leyendo solo la cuenta de ZM Lash; para el
  costo de ZM Tech hace falta su propia admin key.

### Identidad: quién escribe

Hoy no hay forma de unir un teléfono con un dueño: `tenants` y `profiles` no guardan
teléfono, y solo `employees.phone` existe (sin verificar). Propuesta:

1. Si el teléfono coincide con un contacto verificado en `support_contacts`, el agente ya sabe
   el usuario, el tenant y el rol.
2. Si no, el agente pide el correo de la cuenta y envía un código de 6 dígitos con el mismo
   SMTP de Resend del auth (`no-responder@`). El usuario lo escribe en el chat y el código
   (no el modelo) lo valida y guarda el contacto verificado.
3. Sin verificar, solo nivel 1. El agente trata a la persona como prospecto y no revela
   datos de ninguna cuenta.

El `tenant_id` de cada herramienta lo fija el código desde `support_contacts`. El modelo
nunca lo elige ni lo recibe como parámetro.

### Datos nuevos (migración)

- `support_contacts`: `phone`, `profile_id`, `tenant_id`, `role`, `verified_at`.
- Las tres tablas llevan `product` (hoy siempre `geemastudio`). Viven en `udelx…` porque
  los datos y el Auth que el agente lee y usa están ahí; si el soporte se vuelve
  multiproducto, se mueven al hub (`hub_support_*`) y cada producto conserva sus herramientas.
- `support_messages`: historial del número de soporte. No se mezcla con `wa_messages`, que es
  por tenant.
- `support_tickets`: `contact`, `tenant_id`, `summary`, `diagnosis` (JSON de lo que vio el
  agente), `status`, `created_at`, `resolved_at`.

RLS cerrada; acceso solo por service role desde la función. La migración sigue la regla
local = remoto (`<version>_<name>.sql`).

### Guía única

Fuente única: `packages/shared-schema/src/utils/guia-ayuda.ts` (`GUIA_AYUDA`,
`GUIA_CATEGORIAS`), que usa el Centro de Ayuda del panel web. La Edge Function lee una
copia idéntica en `supabase/functions/_shared/guia-ayuda.ts` (el bundle de Supabase no
resuelve paquetes del monorepo); un test de `support-webhook`, que corre en el workflow,
falla si difieren. Cada cambio de producto que altere un flujo actualiza esa guía en el
mismo PR.

### Escalamiento

`escalar_a_humano` crea el ticket y avisa a Alberto por **Telegram** (decidido el
16-oct-2026: sin ventana de 24 h ni plantillas). El aviso (`support-webhook/telegram.ts`)
lleva caso, categoría, urgencia, contacto, si llegó en horario y el resumen, en texto
plano. También avisa una sola vez cuando la cuenta de Anthropic de ZM Tech se queda sin
crédito. Si Telegram falla o faltan sus secrets, el aviso queda en los logs y el caso en
`support_tickets`; la respuesta al usuario no se bloquea. El usuario recibe un número de
ticket y el aviso de que una persona lo contacta.

Configurar el bot (lo hace Alberto; el token nunca va al repo ni al chat):
1. En Telegram, escribir a `@BotFather` → `/newbot` → nombre (p. ej. «Soporte GeemaStudio»)
   y usuario terminado en `bot`. BotFather devuelve el token.
2. Abrir el chat con el bot nuevo y mandarle cualquier mensaje (para un grupo: agregar el
   bot al grupo y escribir algo ahí).
3. Abrir `https://api.telegram.org/bot<TOKEN>/getUpdates` en el navegador y copiar
   `message.chat.id` (en grupos es negativo).
4. `supabase secrets set SUPPORT_TELEGRAM_BOT_TOKEN=… SUPPORT_TELEGRAM_CHAT_ID=…
   --project-ref udelxwwnyivknslueerr` (o en el dashboard, Edge Functions → Secrets).
   Toman efecto sin redeploy.
5. Probar: escalar un caso desde un teléfono de QA (`51999000978`–`999`).

El bot solo envía; no lee ni responde mensajes de Telegram.

Horario de atención humana: **8:00 a 20:00, hora de Venezuela (UTC−4, sin horario de
verano)**, todos los días hasta que se defina otra cosa. El horario lo calcula el código y
se pasa al agente: dentro del horario dice que una persona responde en breve; fuera de él,
que el caso queda registrado y se atiende desde las 8:00. Para avisar fuera de la ventana de 24 h hace falta una
plantilla aprobada ("tu caso #N fue atendido").

## Fases

**F0: prerrequisitos**
- Número de WhatsApp **nuevo** para soporte (decidido el 16-oct).
- ZM Tech todavía no tiene Business Manager (portafolio de negocio) de Meta, y Geema tampoco.
  No hace falta para construir y probar F1–F3:
  - Desarrollo: app de Meta for Developers con el producto WhatsApp. Meta crea una WABA de
    prueba con un número de prueba, sin método de pago, que solo escribe a los teléfonos
    destinatarios que se registren en la app. Webhook de esa app → `support-webhook`.
  - Producción (número real, display name «ZM Tech», sin tope de destinatarios): portafolio
    de ZM Tech creado y, para subir los límites de envío, verificación del negocio. Se hace
    en paralelo; el código no cambia, solo el `phone_number_id` y el token.
- No se usa la WABA de ZM Lash: el número quedaría con la marca y los límites del salón.
- `ZMTECH_ANTHROPIC_API_KEY` configurado en `udelx…` con una key nueva de la cuenta de
  Anthropic de Alberto (hecho el 16-oct-2026).
- Alias `soporte@zmtechdev.com` en ImprovMX verificado (pendiente desde el 16-oct).

**F1: nivel 1 y escalamiento** (código listo el 16-oct-2026; falta probar con el número de prueba)
- Cliente Messages en `_shared/agent/` sin cambiar ZM Lash (hecho el 16-oct-2026).
- `support-webhook` con `ver_guia` y `escalar_a_humano`, tablas `support_messages` y
  `support_tickets` (migración `20261017011400_support_messages_tickets`).
- Guía única compartida con la web.
- Para activarlo, secrets en `udelx…` (los pone Alberto, nunca en el repo ni en el chat):
  `SUPPORT_WA_PHONE_NUMBER_ID`, `SUPPORT_WA_ACCESS_TOKEN`, `SUPPORT_WA_VERIFY_TOKEN` y
  `SUPPORT_META_APP_SECRET` (App Secret de la app de Meta for Developers). Webhook de la
  app: `https://udelxwwnyivknslueerr.supabase.co/functions/v1/support-webhook`, campo
  `messages`. Sin esos secrets la función rechaza todo (fail-closed). Para los avisos:
  `SUPPORT_TELEGRAM_BOT_TOKEN` y `SUPPORT_TELEGRAM_CHAT_ID` (ver «Escalamiento»).

**F2: identidad y diagnóstico**
- `support_contacts` y verificación por código al correo.
- `ver_estado_cuenta` (onboarding, correo, plan) y `ver_estado_whatsapp` (número, conexión,
  pausas, últimos errores de `wa_error_log`).

**F3: acciones seguras**
- Reenviar código de verificación, enviar código de recuperación, reactivar el bot.
- Permisos por rol en código: el personal no ejecuta acciones de dueño.

## QA

- Teléfonos `51999000978`–`999` y tenants demo (`reset-demo-tenant`).
- Casos obligatorios: un número no verificado pide datos de otro salón; un verificado de un
  tenant pregunta por otro; el modelo intenta una acción fuera del nivel 3; falla de
  Anthropic (reintento y luego mensaje útil con opción de dejar el caso, sin quedar mudo).

## Riesgos

- **Fuga entre tenants**: el riesgo mayor. Se mitiga con el `tenant_id` fijado en código y
  con los casos de QA de arriba.
- **Guía desactualizada**: el agente responde con seguridad algo que ya cambió. Se mitiga
  con una sola fuente y la regla de actualizarla en el PR.
- **Bugs nuevos**: el agente describe lo que ve en la cuenta, no diagnostica código.
  Todo lo que no encaje escala.
- **Cuota de Resend**: los códigos de verificación de soporte comparten los 100 correos al
  día del plan gratis con el auth.

## Decisiones abiertas

- Días de atención (por ahora, todos los días de 8:00 a 20:00 VET).

Decidido (16-oct-2026): número nuevo; horario 8:00–20:00 VET; desarrollo con el número de
prueba de Meta mientras no exista el portafolio de ZM Tech; avisos de escalamiento por
Telegram.

## Pendientes (16-oct-2026)

Bloqueado por Alberto:
1. App en Meta for Developers con WhatsApp y los secrets `SUPPORT_WA_*` y
   `SUPPORT_META_APP_SECRET`; webhook apuntando a `support-webhook`, campo `messages`.
2. Bot de Telegram y sus dos secrets (pasos en «Escalamiento»).
3. Mergear el PR #92 de F1. El merge despliega todas las Edge Functions.
4. QA de F1 con el número de prueba y los teléfonos `51999000978`–`999`, con los casos de
   la sección QA.
5. Portafolio de negocio de ZM Tech en Meta y número real (producción).
6. Alias `soporte@zmtechdev.com` en ImprovMX verificado.

Código y operación:
7. F2 y F3 (arriba).
8. Plantilla aprobada para avisar fuera de la ventana de 24 h («tu caso #N fue atendido»).
9. `whatsapp-webhook` adopta `_shared/meta-signature.ts` (hoy no valida la firma de Meta).
10. `sync-anthropic-billing` con admin key de ZM Tech, para el saldo de
    `zmtech_anthropic_wallet_usd`.
11. Advisors de `udelx…` previos a F1: 5 funciones `SECURITY DEFINER` ejecutables por
    `authenticated` y la protección de contraseñas filtradas apagada.
12. Borrar la rama integrada `feat/waba-agente-fase2`, local y remota.
13. Cuando se acumulen pushes que tocan archivos de la raíz, confirmar que la landing no
    construye de más (turbo-ignore con el clon de 10 commits).
