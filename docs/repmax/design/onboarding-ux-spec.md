# Onboarding Mobile - Mejoras de Diseno (Base para Pencil)

> Documentación del repo: [docs/README.md](../README.md) · diseño: `onboarding.pen` · sistema: [`../design-system/`](../design-system/) · prototipo: [`prototype/index.html`](./prototype/index.html).

## Objetivo

Mejorar claridad, conversion y sensacion de calidad del flujo onboarding de `apps/mobile`, manteniendo el estilo Industrial Dark y copy cercano al mercado venezolano.

## Metas de UX

- Reducir friccion en primeros 30-60 segundos.
- Mostrar valor rapido antes de pedir registro.
- Asegurar continuidad visual entre onboarding, login y dashboard.
- Preparar variantes dark/light sin rehacer layout.

## Flujo Propuesto (V2)

0. Auth choice: crear cuenta o iniciar sesion (antes de personalizar nada).
1. Seleccion de pais.
2. Seleccion de rubro vehicular (carros, motos, ambos).
3. Seleccion de tipo de negocio.
4. Seleccion de estilo visual (tema).
5. Preview de tablero personalizado -> CTA completa el onboarding directo.

El splash de marca nativo (`app.json` / `splash.png`) cubre el cold start de la app (wordmark RepMAX).

El paso Splash del prototipo (`design/prototype/index.html`) **se reserva** para un splash de **sesión del tenant**: cuando la tienda suba su logo, esa marca se muestra al iniciar sesión (post-login), no en el onboarding de primera vez. No hay artboard `ONB-01-Splash` en el `.pen` de onboarding; el flujo cableado arranca en `ONB-00-Auth`.

> Cambio respecto a la V1 de este documento: la decision "crear cuenta vs.
> demo/login" ya no ocurre al final del wizard (pantalla 7). Ocurre al
> principio, en `ONB-00-Auth`. Quien elige "Iniciar sesion" salta directo a
> `LoginScreen` sin pasar por personalizacion. Quien elige "Crear cuenta"
> recorre el wizard (pais→preview) y el CTA final de Preview llama
> `completeOnboarding()` (sin pantalla intermedia). El link "Explorar con
> demo" (login demo) vive ahora en `ONB-00-Auth`, no en una pantalla de
> decision aparte.

## Mejoras Globales de Diseno

### 1) Jerarquia visual

- Titulo principal siempre arriba, maximo 2 lineas.
- Subtitulo en tono de apoyo (1-2 lineas).
- CTA primario fijo en footer.
- Barra de progreso compacta y consistente en todos los pasos.

### 2) Ritmo y espaciado

- Margen horizontal base: 20.
- Separacion entre bloques: 16/20/24 segun prioridad.
- Cards con alto minimo consistente para evitar "saltos" visuales.

### 3) Interaccion

- Estados claros por componente: normal, hover/press, selected, disabled.
- Feedback instantaneo al seleccionar (borde + fondo + icono check).
- Transiciones cortas (120-200ms), sin animaciones pesadas.

### 4) Accesibilidad

- Contraste AA minimo en texto principal y CTAs.
- Touch targets de al menos 44x44.
- Evitar texto demasiado pequeno en notas secundarias.

## Sistema Visual (Aplicable en Pencil)

### Colores base

- Fondo principal: `#0D0D0D`
- Superficie/card: `#1A1A1A`
- Superficie elevada: `#242424`
- Borde: `#2E2E2E`
- Texto primario: `#F5F5F5`
- Texto secundario: `#9E9E9E`
- CTA principal: `#FF6B00`

### Tokens light mode (propuesto)

- Fondo principal: `#F7F7F8`
- Superficie/card: `#FFFFFF`
- Superficie elevada: `#F0F1F3`
- Borde: `#DADDE2`
- Texto primario: `#111318`
- Texto secundario: `#5A6270`
- CTA principal: `#E85C00`

### Tipografia

- Familia: Inter
- Titulo: 28/32 semibold-bold
- Subtitulo: 16/24 regular
- Label: 13/18 medium
- Boton: 16/20 semibold
- Nota: 12/16 regular

## Estructura de Pantallas para Pencil

## Pantalla 0 - Auth choice

- Logo + titulo de marca ("Gestiona tu tienda de repuestos").
- Primario: "Crear cuenta" -> entra al wizard (pantallas 2-6).
- Secundario: "Iniciar sesion" -> `LoginScreen` directo, sin wizard.
- Link de texto: "Explorar con demo" (login demo, mismo comportamiento que
  tenia la vieja pantalla de Decision).
- Nota legal breve al pie.

## Pantalla 2 - Pais

- Card destacada para Venezuela.
- Grid 2 columnas para otros paises.
- CTA no necesario: seleccion avanza de una.
- Microcopy: "Configuramos tu tienda para tu mercado."

## Pantalla 3 - Vehiculos

- 3 cards verticales grandes.
- Cada card con icono, titulo, descripcion.
- Seleccion avanza automaticamente.
- Microcopy: "Cuadramos el sistema para tu inventario real."

## Pantalla 4 - Tipo de negocio

- Repuesteria / Taller / Ambos.
- Misma estructura de cards para consistencia.
- Seleccion avanza automaticamente.

## Pantalla 5 - Tema

- Lista de 3 temas con swatch de color.
- Estado selected mas notorio (borde + glow leve + check).
- CTA fijo: "Continuar".

## Pantalla 6 - Preview

- Mock de dashboard con color del tema.
- KPI placeholders y tab bar simulada.
- CTA fijo: "Se ve brutal, continuar" -> completa el onboarding directo
  (ya no navega a una pantalla de decision).

> Nota: la pantalla "ONB-07-Decision" del `.pen` ya no forma parte del
> flujo cableado en `apps/repmax-mobile` (el screen React Native y su ruta
> fueron eliminados). El frame se mantiene en el `.pen` como referencia
> historica/component-library; sus dos responsabilidades (crear cuenta,
> demo) quedaron redistribuidas entre `ONB-00-Auth` (demo, iniciar sesion)
> y el CTA de Preview (crear cuenta).

## Componentes Base a Diseñar en Pencil

- Barra de progreso (5 pasos).
- Card de seleccion (icono + titulo + descripcion + estado).
- Boton primario y secundario.
- Layout base con header + contenido + footer fijo.
- Toast/alerta de error (para demo/login fallido).

## Copy propuesto (tono VE, profesional)

- "Vamos a montar tu tienda en dos toques."
- "Escoge lo que vendes y te dejamos todo cuadrado."
- "Asi te quedaria el panel desde el dia uno."
- "Dale, vamos a poner esto a producir."

## Checklist de QA de Diseno

- [x] Se entiende cada pantalla en menos de 3 segundos.
- [x] CTA principal siempre visible.
- [x] El progreso es evidente y consistente.
- [x] No hay saltos de layout entre pasos.
- [x] Estados de seleccion y disabled son obvios.
- [x] Dark y light mantienen legibilidad.

## Convencion de Artboards en Pencil

- `ONB-00-Auth` (login/crear cuenta — pantalla inicial, previa al wizard)
- `ONB-02-Pais`
- `ONB-03-Vehiculos`
- `ONB-04-Negocio`
- `ONB-05-Tema`
- `ONB-06-Preview`
- `ONB-07-Decision` (fuera del flujo cableado — ver nota en Pantalla 6)

El splash vive en dos capas:

- **Cold start nativo** — `app.json` / `splash.png` (wordmark RepMAX).
- **Splash de sesión (futuro)** — cuando el tenant suba el logo de su tienda, se muestra al iniciar sesión. El paso Splash del prototipo HTML se conserva como placeholder de esa pantalla; no se recablea al onboarding de primera vez.

## Entregables

1. ~~Wireframe low-fi por pantalla.~~ → subsumido en high-fi Pencil
2. [x] High-fi dark mode — `onboarding.pen` (ONB-00, 02…07)
3. [x] Variante light mode — `ONB-*-Light`
4. [x] Prototipo navegable — `design/prototype/index.html` (+ FlowMap en el `.pen`)

### Prototipo tap-through

Abrir en el navegador: [`prototype/index.html`](./prototype/index.html)  
Mapa de flujo / motion contract: frame `UXStates / FlowMap` en `onboarding.pen`.
