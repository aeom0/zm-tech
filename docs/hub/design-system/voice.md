# Voice — Hub

## Tono

Español LATAM con naturalidad venezolana suave. Operativo, corto, sin marketing. Es un panel interno para Alberto (y futuro equipo), no un producto de venta.

## Reglas

- Tutear o imperativo neutro: “Entrar”, “Guardar”, “Convertir a cliente”
- Errores concretos: qué falló + qué hacer
- Sin emojis en UI
- Strings en `apps/hub/src/lib/content.ts`

## CTAs

| Contexto     | Copy                           |
| ------------ | ------------------------------ |
| Login        | Entrar                         |
| Logout       | Salir                          |
| Alta         | Nuevo cliente / Nuevo proyecto |
| Lead         | Convertir a cliente            |
| Ticket       | Marcar resuelto                |
| Recordatorio | Hecho                          |

## Errores / empty

| Situación            | Copy                                                             |
| -------------------- | ---------------------------------------------------------------- |
| Credenciales         | No se pudo iniciar sesión. Revisá correo y clave.                |
| Sin acceso           | Tu cuenta no figura en hub_members.                              |
| Lista vacía clientes | Todavía no hay clientes. Cargá el inventario o convertí un lead. |
| Red / Supabase       | No pudimos hablar con el servidor. Probá de nuevo.               |

## Evitar

- “¡Éxito!” / “Wow” / anglicismos innecesarios
- Textos largos de onboarding en el panel
- Jerga técnica en empty states (salvo sin-acceso, donde el hint de schema ayuda al founder)
