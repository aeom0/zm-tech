# Plan: clasificación de diseños de uñas y cotizador (borrador)

Estado: pendiente de retomar (documentado el 10-oct-2026). Tenant: ZM Lash.

## Objetivo

Saber si Haiku Vision puede identificar el tipo de diseño de uñas que envían las
clientas (francesa, cat eye, vitral, chrome, etc.) para armar un componente que
cotice. El dinero lo sigue calculando el código con reglas del salón; el modelo
solo clasifica, nunca fija montos.

## Contexto y hallazgos

- El agente Haiku no ve imágenes. Solo `classifyInboundImage`
  (`lib/image-classify.ts`, `claude-haiku-4-5-20251001`) mira la foto, y solo
  distingue `comprobante_pago | diseno_referencia | otro`.
- Con el cutover del agente (8-oct) se perdió el takeover de fotos de diseño: el
  agente respondía "no alcanzo a ver el detalle" sin pausar. Restaurado en
  `245258ce` (`agent/inbound.ts`, `tryHandleDesignImageTakeover`), desplegado.
- Hasta el 8-oct había 23 pausas por foto de diseño; entre el 8 y el 10-oct, 1
  pausa y 7 fotos de 5 clientas sin atención del staff (…1872, …6320, …3329,
  …5986, …1716). Requieren contacto manual del salón.
- La BD no distingue uñas de pestañas/cejas: la muestra tiene 51 fotos con URL
  (27 uñas, 10 pestañas, 2 cejas, 7 comprobantes, 4 otro, 1 ilegible según Haiku).

## Muestra para etiquetar

CSV `muestra_fotos_diseno.csv` (51 filas, teléfonos enmascarados a los últimos 4
dígitos). Copia en `C:\Users\alber\Downloads\ZM-Lash\`. No se versiona: contiene
URLs de fotos de clientas.

Columnas: fecha Lima, URL, caption, qué pasó (pausó / staff / agente sin pausar /
sin respuesta / comprobante), preclasificación Haiku (tipo, estilo, largo, forma,
detalle, confianza) y cuatro columnas vacías para el salón:
`SALON_tipo`, `SALON_estilo`, `SALON_precio_o_nivel`, `SALON_notas`.

Estilos propuestos a Haiku (a validar con el salón): francesa, francesa_color,
cat_eye, vitral, chrome, glitter, degradado, nail_art_pintado, 3d_pedreria,
color_solido, encapsulado, baby_boomer, otro. En la muestra Haiku no usó
"vitral" ni "cat_eye" explícito (los asoció a chrome).

## Próximos pasos

1. El salón llena las columnas `SALON_*` del CSV.
2. Medir precisión de Haiku por tipo y por estilo contra esas etiquetas.
3. Definir con el salón la taxonomía final y la regla de precio o nivel por
   estilo, largo y complejidad (precio lo fija el código, no el modelo).
4. Si la precisión alcanza: ampliar `classifyInboundImage` con tipo y estilo, y
   exponer el resultado como dato al staff (pre-cotización) antes de
   automatizar cualquier respuesta a la clienta.
5. Decidir si se restaura también el takeover de audios (`tryHandleAudioTakeover`).

## Pruebas pendientes

- QA del takeover restaurado con `51999000985` (suite de pausa por diseño).
- No hay test que cubra `routeAgentInbound`; conviene agregar uno.
