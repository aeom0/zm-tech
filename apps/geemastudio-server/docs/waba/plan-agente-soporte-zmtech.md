# Plan: agente de soporte de ZM Tech por WhatsApp (Haiku 5.5)

Estado: borrador (16-oct-2026). Alcance inicial: tenants de GeemaStudio (proyecto `udelx…`).
OdentalPro y RepMAX quedan fuera hasta que el agente esté estable con Geema.

## Objetivo

Un número de WhatsApp de ZM Tech donde dueños y personal de los salones escriben sus dudas
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

Se mueve a `supabase/functions/_shared/agent/` lo que hoy es genérico en
`whatsapp-webhook/agent/`:

- Cliente Messages (`anthropic.ts`): hoy lee `ANTHROPIC_API_KEY` fijo (línea 72). Pasa a
  recibir la key como parámetro.
- Ciclo del agente (`agent.ts`) e historial (`history.ts`), sin las herramientas de reservas.
- Validación de Meta, deduplicación y agrupado de ráfagas.

Las 16 herramientas de reservas (`tools.ts`) y el prompt del salón (`prompt.ts`) se quedan en
`whatsapp-webhook`. El refactor no debe cambiar el comportamiento de ZM Lash: se valida con
`agent.test.ts` y el simulador antes de tocar soporte.

### API key de Anthropic

ZM Tech usa **su propia key** (cuenta de Anthropic de Alberto), separada de la de ZM Lash:

- Secret nuevo en `udelx…`: `ZMTECH_ANTHROPIC_API_KEY`. Lo configura Alberto con
  `supabase secrets set` o desde el dashboard; la key no va al repo ni al chat.
- `support-webhook` solo lee ese secret, y `whatsapp-webhook` sigue con `ANTHROPIC_API_KEY`.
  Si una cuenta se queda sin crédito, la otra no se cae.
- El seguimiento de saldo (`lib/haiku-usage.ts`) usa claves globales en `app_config`
  (`anthropic_wallet_usd`, `anthropic_api_status`) y `sync-anthropic-billing` asume una sola
  cuenta. Hay que separarlas por cuenta (por ejemplo, prefijo `zmtech_`) para que el aviso
  de crédito agotado diga de qué cuenta es.

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
- `support_messages`: historial del número de soporte. No se mezcla con `wa_messages`, que es
  por tenant.
- `support_tickets`: `contact`, `tenant_id`, `summary`, `diagnosis` (JSON de lo que vio el
  agente), `status`, `created_at`, `resolved_at`.

RLS cerrada; acceso solo por service role desde la función. La migración sigue la regla
local = remoto (`<version>_<name>.sql`).

### Guía única

Las FAQ viven hoy en el código de `apps/geemastudio-web/src/app/(shell)/panel/ayuda/page.tsx`
(arreglo `FAQS`). Se mueven a un archivo compartido que leen la web y el agente, para que la
respuesta del agente nunca quede atrás de la pantalla de ayuda. Cada cambio de producto
que altere un flujo actualiza esa guía en el mismo PR.

### Escalamiento

`escalar_a_humano` crea el ticket y avisa a Alberto. Canal a definir (WhatsApp al número
personal, Telegram o correo a `soporte@`). El usuario recibe un número de ticket y el aviso
de que una persona lo contacta.

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
- `ZMTECH_ANTHROPIC_API_KEY` configurado, con una key nueva de la cuenta de Anthropic de
  Alberto (no se reutiliza la de otros proyectos).
- Alias `soporte@zmtechdev.com` en ImprovMX verificado (pendiente desde el 16-oct).

**F1: nivel 1 y escalamiento**
- Refactor a `_shared/agent/` sin cambiar ZM Lash.
- `support-webhook` con `ver_guia` y `escalar_a_humano`, tablas `support_messages` y
  `support_tickets`.
- Guía única compartida con la web.

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

- Canal del aviso de escalamiento.
- Días de atención (por ahora, todos los días de 8:00 a 20:00 VET).

Decidido (16-oct-2026): número nuevo; horario 8:00–20:00 VET; desarrollo con el número de
prueba de Meta mientras no exista el portafolio de ZM Tech.
