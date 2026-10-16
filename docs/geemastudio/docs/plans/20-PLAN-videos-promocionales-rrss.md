# Plan 20 — Videos promocionales y contenido para redes

**Fecha:** 2026-10-16
**Estado:** F0 completada (reel v1, 15-oct-2026). F1–F6 (incluye el piloto F3b) por hacer
**Repos afectados:** `zm-tech` (`apps/geemastudio-promo`, `packages/geema-mockups`, `.cursor/skills`)
**Relacionado:** Plan 10 (landing multi-tenant), Plan 17 (planes de suscripción), Plan 19 W13 (alta self-service y trial de 14 días), Plan 04 S7 (loop Meta Ads)

---

## Por qué existe

El primer reel (`ReelWhatsApp`) funcionó: muestra en 24 s lo que hace Geema, con las pantallas reales de la app. Hoy es mudo, existe en un solo formato y no hay un ritmo de publicación. Este plan lo convierte en una línea de producción: sonido, voz, más formatos, más reels y una operación de redes con calendario y aprobación.

## Qué ya existe (F0)

- **`apps/geemastudio-promo`** (Remotion 4): `ReelWhatsApp` 9:16 de ~24 s (gancho → asistente agenda por WhatsApp → agenda → finanzas → cierre). Se exporta con `pnpm --filter geemastudio-promo render:reel`. Detalle en el [README de la app](../../../../apps/geemastudio-promo/README.md).
- **`@geemastudio/mockups`**: pantallas de la app con props de progreso. Las usan la landing y los videos.
- **Skills en `.cursor/skills/`**: `remotion-*` (incluye audio, efectos de sonido, voz en off y subtítulos), `frontend-design`, `canvas-design`, `theme-factory`, `webapp-testing`, `skill-creator`, `social-media-organic`, `banner-design`, `meta-ads-manager`.

## Herramientas

| Herramienta | Para qué | Requiere |
|-------------|----------|----------|
| Skills `remotion-markup` (audio, sfx, voiceover) y `remotion-captions` | Montar sonido, voz y subtítulos en el video | Nada; ya instaladas |
| [`elevenlabs/skills`](https://github.com/elevenlabs/skills) (oficiales) | Generar voz en off, música y efectos de sonido | Instalar con `npx skills add elevenlabs/skills`; API key de ElevenLabs. El uso comercial pide un plan de pago (revisar el precio vigente) |
| Plugin **small-business** de Anthropic (ya instalado, 44 skills) | Operación de marketing: ver el detalle abajo | Funciona sin conectores; con Canva o HubSpot autorizados hace más |
| `social-media-organic`, `meta-ads-manager` (skills del repo) | Copy orgánico, Meta Ads y CTWA | Lo que ya usan hoy |
| [Higgsfield](https://higgsfield.ai) | Tomas reales generadas con IA (Kling, Veo, Seedance): manos, salones, celulares. Complementa a Remotion, no lo reemplaza | Plan pago para uso comercial (Starter ~US$19/mes; confirmar precio vigente) y autorizar su conector MCP (`https://mcp.higgsfield.ai/mcp`). Alternativas: Runway, Luma, Veo por la API de Gemini |

### Qué sirve del plugin small-business

Está pensado para el dueño de un negocio. Para Geema sirve la parte de marketing:

| Skill | Uso en este plan |
|-------|------------------|
| `brand-style` | Guardar la marca de Geema (Lunaris, logo, tono) para que todo lo que produce el plugin salga con ella. Se hace una vez, desde `geema.zmtechdev.com` |
| `social-content-engine` | Calendario de publicaciones permanente, captions con la voz de Geema y un video reutilizado en todos los formatos. Deja cada post listo para aprobar; no publica solo |
| `canva-creator` | Piezas estáticas en Canva a partir de un brief aprobado. Solo si se autoriza el conector de Canva; si no, `canvas-design` hace PNG/PDF locales |
| `ad-manager` | Leer resultados de anuncios (desde CSV exportado de Meta o conector), proponer cambios con su impacto y redactar anuncios nuevos. Complementa `meta-ads-manager` |
| `marketing-monday` | Resumen semanal: qué funcionó, qué hizo la competencia y las 3 acciones de la semana |
| `seo-ai-visibility` | Auditar la landing de Geema para Google y para asistentes de IA (llms.txt, schema.org, render sin JS) |

No aplican a Geema hoy: finanzas, nómina, impuestos, inventario y ventas del plugin. Queda como idea aparte: estas skills son el tipo de ayuda que un salón cliente de Geema también necesitaría.

## Decisiones

- **Las pantallas salen de `@geemastudio/mockups`.** Si un video necesita un estado nuevo, se agrega en el paquete y la landing también lo recibe.
- **Nada se publica solo.** Todo post, anuncio o envío pasa por la aprobación de Alberto.
- **Cifras verificables o nada.** Ningún video ni post usa estadísticas sin fuente (las de `DemoSection` siguen sin verificar).
- **Música en orgánico: dentro de la app.** En Instagram y TikTok la música se agrega al publicar (audio en tendencia, más alcance). Los videos orgánicos llevan solo voz y efectos. Los anuncios y la web llevan música integrada.
- **Claves fuera del repo.** `ELEVENLABS_API_KEY` vive en `apps/geemastudio-promo/.env` (en `.gitignore`), nunca en el chat ni en commits.
- **IA generativa solo para escenas genéricas.** Las tomas de Higgsfield o similares muestran situaciones (una manicura, un salón), nunca clientas ni testimonios presentados como reales, y nunca pantallas de la app. Si hay personas realistas, se marca como contenido generado con IA al publicar en Meta y TikTok.
- **Copy:** español LATAM neutro, sin voseo. Emojis solo dentro de mensajes de WhatsApp.

## Fases

### F1 — Efectos de sonido

Sin costo ni claves. Con `@remotion/media`:

- Sonido de notificación en cada tarjeta del gancho.
- Pop suave en cada burbuja del chat (distinto para la clienta y el asistente) y un «ding» al confirmarse la cita.
- Whoosh en las transiciones; sonido sutil al entrar la cita en la agenda.
- Volumen bajo y consistente; preferir sonidos propios en `public/sfx/` a URLs remotas para no depender de terceros al renderizar.

**Listo cuando:** el reel exportado suena bien con y sin audífonos, y ningún efecto tapa a otro.

### F2 — Voz en off y subtítulos

- Instalar `elevenlabs/skills` en `.cursor/skills/` (carpeta real, como las demás) y registrarlas en `SKILLS.md`.
- Guion de una frase por escena. Borrador: «¿Atendiendo y no paran de escribirte?» → «Tu asistente responde, cotiza y agenda por ti, 24/7» → «La cita entra sola a tu agenda» → «Y sabes cuánto ganas, sin Excel» → «Prueba GeemaStudio gratis 14 días».
- Elegir la voz (femenina o masculina, acento latino neutro) entre 2–3 muestras.
- Script `generate-voiceover.ts` que genera un mp3 por escena en `public/voiceover/<composición>/`. La duración de cada escena se ajusta al audio con `calculateMetadata`.
- Subtítulos quemados con `remotion-captions`, en la zona segura y con el estilo de marca (la mayoría ve los reels sin sonido).

**Listo cuando:** hay dos exportaciones del reel: con voz + subtítulos y solo subtítulos.

### F3 — Música integrada (anuncios y web)

- Generar 2–3 pistas instrumentales con ElevenLabs Music (ritmo medio, cálido, sin letra) y elegir una.
- La música baja cuando habla la voz y sube en el cierre.
- Variante 16:9 o 1:1 sin voz para la landing (autoplay mudo con subtítulos).

**Listo cuando:** existe la versión para Meta Ads con música y la versión orgánica sin música.

### F3b — Piloto de tomas con IA (Higgsfield)

- Generar 3–4 tomas de gancho de 1–2 s: alguien atendiendo con el celular sonando, manos con uñas recién hechas, una aplicación de pestañas, un barbero trabajando.
- Guardarlas en `public/broll/` y abrir el reel con una de ellas antes de pasar a las pantallas de `@geemastudio/mockups`.
- Comparar el reel con y sin toma real (retención a 3 s en el primer test de Meta Ads o en orgánico).

**Listo cuando:** hay datos para decidir si se mantiene la suscripción o se usa solo para F4.

### F4 — Formatos y variantes

- Mismo reel en 9:16 (Reels/TikTok/Stories), 4:5 (feed y anuncios) y 1:1. El layout se adapta por formato, no se recorta.
- Props con schema Zod para editar en Studio el nombre del negocio, el servicio, el precio y el chat sin tocar código.
- Variantes por vertical: uñas, pestañas, barbería y spa, cambiando datos, copy y (si F3b funciona) la toma de apertura.

### F5 — Más reels

Un reel por función, reutilizando escenas:

1. Recordatorios automáticos y menos inasistencias.
2. Comisiones y pagos al equipo.
3. Mi Web: la página del salón lista en minutos.
4. Inventario y venta de productos.
5. Promo masiva por WhatsApp.

Al terminar F5, crear con `skill-creator` una skill propia `geemastudio-promo` con la marca, el área segura, las reglas de copy y las recetas de escena, para que cada reel nuevo sea un pedido corto.

### F6 — Operación de redes

- `brand-style`: cargar la marca de Geema una vez.
- `social-content-engine`: calendario de 4 semanas (cadencia a definir), captions y repurposing de cada reel. Posts en estado «para aprobar».
- Publicación manual por ahora (o staged en HubSpot si se conecta).
- Anuncios: el reel con música como creativo de Meta Ads con CTWA hacia el WhatsApp de Geema; seguimiento con `ad-manager` y `meta-ads-manager`.
- `marketing-monday` semanal y una auditoría inicial de `seo-ai-visibility` sobre la landing.

## Pendiente de decisión (Alberto)

| # | Decisión | Bloquea |
|---|----------|---------|
| 1 | Crear la cuenta y la API key de ElevenLabs, y el plan (gratis para pruebas, de pago para publicar) | F2, F3 |
| 2 | Voz del narrador | F2 |
| 3 | Canales y cadencia (Instagram, TikTok, Facebook; posts por semana) | F6 |
| 4 | Autorizar Canva y/o HubSpot en el plugin, o seguir sin conectores | F6 (opcional) |
| 5 | Presupuesto de Meta Ads para el primer test | F6 |
| 6 | Suscripción a Higgsfield (Starter para el piloto) y autorizar su conector | F3b |

## Fuera de alcance

- Publicar automáticamente en redes.
- Grabación con personas reales o fotos de clientes de ZM Lash sin su permiso.
- Licencia Company de Remotion mientras ZM Tech tenga 3 empleados o menos.
