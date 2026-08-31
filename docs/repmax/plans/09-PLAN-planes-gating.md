# Plan 09 — Planes de suscripción, gating y setup fee

**Estado:** Propuesta para cierre de primer tenant (reunión en ~2 días)
**Contexto de origen:** Auditoría de código confirmó que Pro/Enterprise son
funcionalmente idénticos hoy — el único gate real (MercadoLibre OAuth) está
congelado por bloqueo externo de MLV (case #475453897). Este plan define
gates reales y precios para poder vender desde ya.

---

## 1. Resumen ejecutivo

RepMAX no tiene hoy ninguna diferenciación funcional real entre planes más
allá de un feature bloqueado a nivel país. Antes de la reunión con el primer
tenant (repuestería Toyota, venta física + ML + FB Marketplace, inventario
no digitalizado) se necesita:

1. Una matriz de planes con precios y gates reales, aunque no todos estén
   implementados en código todavía (algunos se activan manualmente en DB).
2. Una política de setup fee / cargo de instalación.
3. Ubicación clara del primer tenant en la matriz.

---

## 2. Matriz de planes

|                                                    | **Básico**         | **Pro**            | **Enterprise**                                              |
| -------------------------------------------------- | ------------------ | ------------------ | ----------------------------------------------------------- |
| **Precio**                                         | $19/mes            | $55/mes            | $90+/mes                                                    |
| Sucursales                                         | 1                  | Hasta 3            | Ilimitadas                                                  |
| Usuarios (roles)                                   | Hasta 2            | Hasta 5            | Ilimitados                                                  |
| Productos                                          | Hasta 300          | Ilimitado          | Ilimitado                                                   |
| POS + Inventario (web + mobile)                    | ✅                 | ✅                 | ✅                                                          |
| Multi-moneda USD/Bs + tasa BCV/USDT en vivo        | ✅                 | ✅                 | ✅                                                          |
| Catálogo ML-ready (export CSV + fotos optimizadas) | ❌                 | ✅                 | ✅                                                          |
| Catálogo de vehículos por marca preferida          | ✅ (seed genérico) | ✅ (curado)        | ✅ (curado + soporte)                                       |
| Dominio propio (`custom_domain`)                   | ❌                 | ✅                 | ✅ + soporte DNS                                            |
| Reportes                                           | Básicos            | Avanzados + export | Avanzados + Taller module + hardware Bridge (cuando salgan) |

**Nota importante para la reunión:** Pro y Enterprise no distinguen nada más
allá del label hoy en código — la tabla de arriba es el objetivo, no el
estado actual. Ver sección 5 (deuda técnica).

---

## 3. Setup fee (cargo de instalación)

### Estructura oficial (aplica a todo cliente desde ahora)

| Servicio                                        | Costo sugerido                                                               | Incluye                                                        |
| ----------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Migración de catálogo (Excel/cuaderno → RepMAX) | $30–$80 según volumen (flat hasta ~150 productos, +$0.30/producto adicional) | Limpieza de datos, carga asistida, sesión en vivo con el dueño |
| Configuración de dominio propio                 | $25 flat                                                                     | DNS, verificación, wildcard routing                            |
| Onboarding y capacitación (1 sesión)            | Incluido en cualquiera de los dos anteriores                                 | —                                                              |

### Recomendación para este cliente (piloto/fundador)

**No cobrar el setup fee ahora — pero dejarlo facturado en $0 con nota
"descuento fundador", no simplemente omitido.** A cambio, pedir uno de:

- Compromiso de pago trimestral o anual por adelantado en plan Pro, o
- Autorización para usarlo como caso de estudio / testimonio público

Esto preserva el precio de referencia para el próximo cliente sin perder el
cierre de venta del primero.

---

## 4. Ubicación del primer tenant: **Plan Pro**

Repuestería Toyota — venta física + MercadoLibre + FB Marketplace,
inventario en cuaderno/WhatsApp/Excel.

**Por qué Pro y no Básico:** vende en 2+ canales → necesita el catálogo
ML-ready export (aunque la publicación en ML sea manual por el bloqueo de
MLV, y en FB sea 100% manual porque no existe integración). El valor real
que le vendés es fichas de producto limpias y reusables, no automatización
de canal.

**Por qué Pro y no Enterprise:** una sola sucursal por ahora; Enterprise no
tiene nada adicional real que le sirva hoy (Taller module y hardware Bridge
no existen todavía).

**Guión sugerido para la conversación de ML/FB (ser honesto, no vender
humo):**

> "Tu catálogo va a quedar listo para publicar en MercadoLibre y Facebook
> Marketplace en minutos — fotos, ficha técnica, part_number, todo
> ordenado. La conexión 100% automática con MercadoLibre depende de que
> ellos reactiven su API en Venezuela, no de nosotros; en Facebook
> Marketplace no existe integración de ningún proveedor todavía, así que
> ahí también exportás y publicás vos."

---

## 5. Deuda técnica a resolver (post-reunión, no bloqueante para cerrar)

Nada de esto bloquea la venta — hoy se puede dar de alta `plan = 'pro'`
manualmente en `repmax_stores` y el cliente ya tiene acceso completo (los
gates no existen en código). Pendiente para no quedar cobrando Pro sin que
el sistema lo respete a mediano plazo:

- [ ] Columnas de límites en `repmax_stores` o tabla `repmax_plan_limits`
      (max_products, max_store_users, max_sucursales)
- [ ] Helper SQL reusable `repmax_plan_allows(store_id, feature)` para
      futuros gates (reemplaza checks hardcodeados tipo el de ML)
- [ ] Gate real de `custom_domain` en el middleware de subdominios cuando
      se implemente `*.zmtechdev.com`
- [ ] Columna o tabla para trackear setup fee cobrado/exonerado por tienda
      (útil para reportes de founder discounts)

---

## 6. Features reales para la demo (confirmadas por commits recientes)

Ya mergeadas a `main`, usables en vivo en la reunión:

- **POS de escritorio** (`/dashboard/pos`) con lector de código de barras
  HID — ideal para mostrar en la tienda física
- **Tasa BCV/USDT en vivo** (`@zmtech/tasas`) en checkout web y mobile,
  con soporte de pagos mixtos USD/Bs
- **Catálogo de vehículos persistente por tienda** + selector de
  **marcas preferidas** — configurar `preferred_brands = ['Toyota']`
  antes de la reunión para que el picker de "vehículo compatible" salga
  ya filtrado a su nicho
- **Historial de ventas enriquecido** (`/dashboard/sales`) con foto,
  modelo y part_number por línea vendida

---

## 7. Próximos pasos

1. Alberto confirma montos finales (19/55/90 son punto de partida, no
   definitivo)
2. Configurar `preferred_brands = ['Toyota']` en la tienda demo/piloto
   antes de la reunión (vía MCP `execute_sql` o desde Configuración en
   mobile)
3. Post-reunión: si cierra, dar de alta `plan = 'pro'` manualmente en
   `repmax_stores` para el nuevo tenant
4. Agendar sesión de implementación de gates reales (sección 5) cuando
   haya 2-3 tenants más, no antes — no vale la pena construir límites
   para un solo cliente
