# geemastudio-promo

Videos promocionales de GeemaStudio para redes (Reels, TikTok, Shorts), hechos con [Remotion](https://www.remotion.dev) 4. Las pantallas de la app salen de `@geemastudio/mockups` (`packages/geema-mockups`), las mismas que usa la landing de `geemastudio-web`.

## Comandos

```bash
pnpm dev:promo                                        # desde la raíz: abre Remotion Studio
pnpm --filter geemastudio-promo render:reel           # exporta out/reel-whatsapp.mp4
pnpm --filter geemastudio-promo still <Comp> out/x.png --frame=60   # un cuadro suelto
pnpm --filter geemastudio-promo check:types
```

`out/` está en `.gitignore`: los mp4 y stills no se suben al repo.

## Composiciones

| Id | Qué es |
|----|--------|
| `ReelWhatsApp` | Reel 1080×1920 a 30 fps (~24 s): gancho → el asistente agenda por WhatsApp → la cita entra a la agenda → finanzas → cierre |
| `ReelWhatsApp-Escenas/*` | Cada escena suelta (`Gancho`, `WhatsApp`, `Agenda`, `Finanzas`, `Cierre`) para revisarla o exportarla aparte |

Duraciones: `SCENE_S` en `src/ReelWhatsApp.tsx`. La escena de WhatsApp calcula la suya según la conversación (`CHAT` en `@geemastudio/mockups` y los tiempos al inicio de `src/scenes/WhatsAppScene.tsx`).

## Estructura

```
src/
├── brand.ts          # colores Lunaris, fuentes (Inter + Noto Color Emoji) y formato REEL
├── components/       # Backdrop, Headline, Phone
├── scenes/           # una escena por archivo
├── ReelWhatsApp.tsx  # secuencia con transiciones
└── Root.tsx          # registro de composiciones
public/               # logo y assets (staticFile)
```

## Convenciones

- **Animación solo por frame**: `useCurrentFrame()` + `interpolate()`. Las transiciones y animaciones CSS no se renderizan bien.
- **Área segura 9:16**: 80 px a los lados y 100 px arriba y abajo. Titulares de 84 px como mínimo; texto de apoyo de 44 px.
- **Pantallas de la app**: no se dibujan aquí. Si hace falta algo nuevo (un estado, un dato, una prop de progreso), se agrega en `@geemastudio/mockups` para que la landing lo reciba también.
- **Copy**: español LATAM neutro, sin voseo. Emojis solo dentro de mensajes de WhatsApp (copy WABA); en el resto, íconos Lucide.
- **Skills**: `remotion-best-practices` como entrada; `remotion-markup` para animación y layout (ver `.cursor/skills/SKILLS.md`).

## Licencia de Remotion

Es gratis para personas y empresas de hasta 3 empleados, incluso con uso comercial. Si ZM Tech supera ese tamaño, hace falta la Company License ([LICENSE.md](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)).
