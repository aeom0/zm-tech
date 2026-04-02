# SalonPro — Guía de Diseño del Dashboard Administrativo

> En SalonPro los colores y terminología vienen del **tenant** (preset o config guardada en `tenant_settings`). La **marca producto SalonPro** usa la línea **Lunaris** (turquesa → índigo): mobile `Gradients.onboarding` en `constants/theme.ts`; web `LUNARIS` en `apps/web/src/lib/theme.ts`. La app usa `createTheme(config)` según el preset elegido en el onboarding.

## 1. Identidad de Marca

**Propósito**: Empoderar a la dueña del centro de belleza para gestionar eficientemente citas, personal, servicios, inventario y finanzas en una interfaz elegante.

**Dirección Estética**: **Lujoso/refinado** - Estética de spa premium con elegancia contenida. Piensa en la recepción de un salón de belleza de alta gama combinado con una herramienta de productividad moderna. La interfaz debe sentirse sofisticada y calmante, nunca desordenada o barata.

**Elemento Memorable**: Primario **turquesa/teal** (Lunaris) con acentos del tenant (p. ej. dorado) en acciones clave; lienzo claro u oscuro según modo. La vista de calendario es la protagonista: espaciosa, respirable, citas como tarjetas pulidas.

## 2. Arquitectura de Navegación

**Tipo de Layout**: Navegación por pestañas inferiores (5 pestañas para móvil)

**Pantallas Principales**:
1. **Inicio (Dashboard)** - Resumen del día, estadísticas rápidas, próximas citas
2. **Agenda** - Vista completa de calendario con filtrado por chica
3. **Servicios** - Gestionar catálogo de servicios con variantes
4. **Inventario** - Seguimiento de productos y alertas
5. **Finanzas** - Reportes de ingresos e historial de pagos

**Patrón de Navegación**: Pestañas inferiores con íconos. Limpio y simple.

## 3. Paleta de Colores

**Referencia marca / marketing (alineada mobile + web)**:
- Turquesa Lunaris: `#40E0D0` — primario destacado (preset spa-nails, landing)
- Teal: `#00897B` — primario oscuro / hover (Tailwind `primary` en web)
- Índigo (gradiente): `#3949AB` — cierre del gradiente Lunaris

**Colores Primarios (UI tenant — ejemplo spa-nails tras onboarding)**:
- Primario: según `TenantConfig.theme.primaryColor` (preset spa-nails: `#40E0D0`)
- Primario Claro: tintes derivados o `#B2DFDB` (web `primaryLight`)
- Primario Oscuro: `#00897B` o estados presionados del tema

**Colores de Acento**:
- Dorado: `#D4AF37` - Acentos premium, indicadores de éxito, precios
- Dorado Claro: `#F5E6D3` - Resaltados dorados sutiles

**Neutros**:
- Fondo: `#FFFFFF` - Lienzo principal
- Superficie: `#F8F5FA` - Tarjetas, elementos elevados (tinte neutro / sutil)
- Borde: `#E0D6E5` - Divisores, contornos de tarjetas
- Texto Primario: `#1A1A1A` - Títulos, texto importante (casi negro)
- Texto Secundario: `#4A4A4A` - Descripciones, etiquetas
- Texto Atenuado: `#8A8A8A` - Placeholders, estados deshabilitados
- Negro: `#1A1A1A` - Texto fuerte, íconos

**Semánticos**:
- Éxito: `#4CAF50` - Citas completadas
- Advertencia: `#D4AF37` - Alertas de stock bajo (usa dorado)
- Error: `#D32F2F` - Cancelaciones, alertas críticas
- Info: tono primario del tenant o turquesa `#40E0D0` en superficies de marca

## 4. Tipografía

**Familia de Fuentes**: 
- Títulos y Cuerpo: Fuente del sistema (San Francisco en iOS, Roboto en Android)

**Escala Tipográfica**:
- H1 (Títulos de página): 32px, Bold
- H2 (Encabezados de sección): 24px, SemiBold
- H3 (Títulos de tarjeta): 20px, SemiBold
- H4 (Subsecciones): 18px, SemiBold
- Cuerpo: 16px, Regular
- Pequeño (Etiquetas): 14px, Regular
- Label: 12px, Medium
- Texto de Botón: 16px, SemiBold

## 5. Estilizado de Componentes

**Tarjetas**:
- Fondo: Blanco (#FFFFFF)
- Borde: 1px solid #E0D6E5
- Radio de Borde: 16px
- Sombra: Sombra sutil (tinte neutro o del primario del tenant)
- Padding: 16-20px

**Botones**:
- Primario: Fondo primario del tenant (p. ej. turquesa #40E0D0), texto blanco
- Secundario: Fondo blanco, borde y texto primario del tenant
- Acento: Fondo dorado (#D4AF37), texto blanco
- Radio de Borde: Completo (forma de píldora)
- Altura: 52px

**Campos de Entrada**:
- Fondo: #F8F5FA
- Borde: 1px solid #E0D6E5
- Borde en Focus: primario del tenant o #40E0D0
- Radio de Borde: 12px
- Altura: 48px

**Íconos**:
- Usar íconos Feather de @expo/vector-icons
- Activo/Seleccionado: Primario del tenant (Lunaris / turquesa si aplica)
- Inactivo: Gris atenuado (#8A8A8A)
- Acciones de acento: Dorado (#D4AF37)

## 6. Especificaciones por Pantalla

### Inicio (Dashboard)
- Encabezado: "Hoy - [Fecha Actual]" con botón "Nueva Cita"
- Tarjetas de estadísticas en scroll horizontal: Ingresos Hoy, Citas Completadas, Próximas
- Lista de citas del día debajo
- Alertas de stock bajo al final

### Agenda
- Vista semanal con columnas por día
- Franjas horarias de 9 AM a 8 PM
- Tarjetas de citas codificadas por color según chica
- Chips de filtro de chicas arriba

### Servicios
- Pestañas/acordeón de categorías
- Tarjetas de servicio mostrando: Nombre, Precio (en dorado), Duración
- Modal para agregar/editar servicio

### Inventario
- Control segmentado: Productos Contables / Insumos
- Tarjetas de productos con insignias de cantidad
- Artículos con stock bajo resaltados con advertencia dorada

### Finanzas
- Selector de período: Hoy, Semana, Mes
- Visualización grande de ingresos con acento dorado
- Lista de historial de pagos

## 7. Sistema de Espaciado

- xs: 4px
- sm: 8px
- md: 12px
- lg: 16px
- xl: 20px
- 2xl: 24px
- 3xl: 32px

## 8. Guías de Animación

- Usar escala sutil (0.98) al presionar botones y tarjetas
- Fade in para modales
- Transiciones suaves para cambios de pestaña
- Retroalimentación háptica en acciones clave
