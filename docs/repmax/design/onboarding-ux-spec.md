# Onboarding Mobile - Mejoras de Diseno (Base para Pencil)

> Documentación del repo: [docs/README.md](../docs/README.md) · diseño relacionado: `design/onboarding.pen` (Pencil).

## Objetivo
Mejorar claridad, conversion y sensacion de calidad del flujo onboarding de `apps/mobile`, manteniendo el estilo Industrial Dark y copy cercano al mercado venezolano.

## Metas de UX
- Reducir friccion en primeros 30-60 segundos.
- Mostrar valor rapido antes de pedir registro.
- Asegurar continuidad visual entre onboarding, login y dashboard.
- Preparar variantes dark/light sin rehacer layout.

## Flujo Propuesto (V2)
1. Splash de marca (breve).
2. Seleccion de pais.
3. Seleccion de rubro vehicular (carros, motos, ambos).
4. Seleccion de tipo de negocio.
5. Seleccion de estilo visual (tema).
6. Preview de tablero personalizado.
7. Decision final (crear cuenta o demo).

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

## Pantalla 1 - Splash
- Logo centrado.
- Tagline corto.
- Duracion 1.0s-1.2s (mas corta para reducir espera).

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
- CTA fijo: "Se ve brutal, continuar".

## Pantalla 7 - Decision
- Titulo orientado a accion.
- Primario: "Crear mi cuenta gratis".
- Secundario: "Probar demo primero".
- Nota de confianza: "Sin enredos, empiezas en minutos."

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
- [ ] Se entiende cada pantalla en menos de 3 segundos.
- [ ] CTA principal siempre visible.
- [ ] El progreso es evidente y consistente.
- [ ] No hay saltos de layout entre pasos.
- [ ] Estados de seleccion y disabled son obvios.
- [ ] Dark y light mantienen legibilidad.

## Convencion de Artboards en Pencil
- `ONB-01-Splash`
- `ONB-02-Pais`
- `ONB-03-Vehiculos`
- `ONB-04-Negocio`
- `ONB-05-Tema`
- `ONB-06-Preview`
- `ONB-07-Decision`

## Entregables
1. Wireframe low-fi por pantalla.
2. High-fi dark mode.
3. Variante light mode.
4. Prototipo navegable (tap-through) con transiciones basicas.

