# Landing — backlog UI/UX

Pendientes de la revisión de hero/landing (jul 2026).  
**Hechos:** (1) fold mobile del hero, (2) nav más liviana, (3) CTAs en Verticales.

Prioridad relativa: media → baja. No bloquean merge del hero con mockups reales.

---

## Prioridad media

### 4. Cotizador home vs `/cotizador`
Dos caminos de cotización (sección `#cotizador` embebida + página self-service). En mobile el embebido es largo.

**Ideas:** CTA fuerte a `/[locale]/cotizador` y aligerar la sección home, o unificar en un solo flujo.

### 5. Integraciones: grid denso
10 cards en 5 columnas = escaneo pobre.

**Ideas:** Agrupar (Pagos / Coms / Fiscal VE) o logo strip + 4–6 destacadas.

### 6. Features: terminal decorativo
El bloque `status: operational / latency < 50ms` no aporta proof.

**Ideas:** Sustituir por métrica real (verticales en prod, clientes, tiempo de entrega).

### 7. TrustBanner genérico
Una línea cosmética/deportes/MLB. Con mockups reales arriba, ahí caben logos/nombres (ZetaEme, ZM Lash, etc.).

### 8. Jerarquía tipográfica uneven
H2 a `text-5xl` en todas las secciones; body `text-xs` en cards de Features/Integraciones.

**Ideas:** Subir body a `text-sm`; bajar un poco los H2 en mobile.

### 9. Accesibilidad
Poco `focus-visible` en botones custom del Hero/Nav; sin `prefers-reduced-motion` en Framer; formularios con focus ring débil.

**Ideas:** Checklist a11y (focus rings, reduced-motion, contraste de placeholders).

---

## Prioridad baja / polish

### 10. Teléfono del hero
Overhang en viewports &lt;380px; `alt` del crossfade hardcodeados en ES (faltan en i18n).

### 11. Contacto
Inputs mono + labels uppercase (ok de marca); placeholders `gray-700` con contraste bajo.

### 12. Ritmo de secciones
Mismo patrón eyebrow + H2 + línea violeta × N.

**Ideas:** Variar una sección (full-bleed, quote, caso de uso).

### 13. Proof social
Falta bloque de resultado (“antes WhatsApp/Excel → ahora sistema”) pegado al gancho del hero.

---

## Contexto

- App: `apps/landing`
- Skills de diseño usadas en la revisión: `ui-ux-pro-max`, `brand`, `ui-styling`, `zmtech-dev`
- Assets hero: `public/hero/*`, preview Beauty: `public/verticales/geemastudio-preview.webp`
