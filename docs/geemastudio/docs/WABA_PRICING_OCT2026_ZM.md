# WABA — Cambio de pricing Meta (1-oct-2026)

Fuente canónica de este hallazgo: repo ZM Lash & Nails Beauty,
[`docs/waba/WABA_PRICING_OCT2026.md`](https://github.com/aeom0/ZM-Lash-and-Nails-Beauty/blob/main/docs/waba/WABA_PRICING_OCT2026.md).
Este archivo es solo un puntero — no duplicar el contenido aquí.

Aplica a Geema porque el WABA (`+51 981 444 430`) y la tabla `waba_pricing_daily`
son **compartidos** entre ZM Lash & Nails (repo legacy) y Geema hoy — no hay
`tenant_id` en esa tabla todavía (`tenant_waba_numbers` solo tiene el seed ZM).
Si se agrega un segundo tenant con WABA propio, este doc y la query de la
fuente canónica deben revisarse para filtrar por número/tenant.

**Resumen de una línea**: no sumar `pricing_category = 'SERVICE'` completo como
volumen facturable — separar `pricing_type = 'FREE_ENTRY_POINT'` (nunca se
cobra, ventana de 72h por anuncios) de `FREE_CUSTOMER_SERVICE` (sí cuenta
contra las 1,000 gratis/mes). El `country_code` de la fila no es confiable
para identificar tráfico real vs. leads de anuncio.
