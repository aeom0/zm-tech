# Consolidación documental ZM Lash → GeemaStudio

> Documento de trabajo para alinear la documentación de `ZM-Lash-and-Nails-Beauty`
> y `zm-tech`. No renombra ni mueve archivos por sí solo.

## Objetivo

Convertir la documentación de ZM Lash y GeemaStudio en una única estructura
consecutiva, donde GeemaStudio sea la fuente de verdad final y ZM Lash quede
como tenant histórico y referencia de migración.

Mientras la migración esté abierta:

- ZM conserva la fuente operativa del runtime WABA y sus Edge Functions.
- Geema conserva la fuente del producto multi-tenant, panel y aplicaciones.
- `docs/geemastudio/docs/plans/04-geema-migration/` es la ubicación canónica consolidada en Geema.
- `docs/plans/geema-migration/` sigue sincronizada temporalmente entre ambos repos.
- Ningún documento nuevo debe crear una tercera numeración paralela.

## Inventario confirmado

### ZM Lash

Planes globales de referencia:

- `01-PLAN-monorepo-estructura.md`
- `02-PLAN-retrofit-tenant-id.md`
- `03-PLAN-audit-paridad-zmlash-geema.md`
- `04-PLAN-ctwa-collages-cierre-intencion.md` (alias legacy del Plan 05)
- `06-PLAN-preview-virtual-extensiones-ctwa.md`
- `07-PLAN-look-preview-multi-servicio.md`
- `07-anexo-prompts-vertex-v1.md`
- `08-PLAN-dispatcher-modular.md`

Carpeta especial actual:

- `plans/geema-migration/` — carpeta histórica sincronizada temporalmente; no es un plan numerado independiente.

Documentación funcional adicional:

- `docs/waba/` — capacidad, simulación, análisis, prompts y lecciones.
- `docs/ops/` — Edge Functions, despliegue, Supabase y Vertex.
- `docs/product/` — producto, monorepo, clientas y diseño.

### GeemaStudio

Planes globales canónicos:

- `01-PLAN-monorepo-estructura.md`
- `02-PLAN-retrofit-tenant-id.md`
- `03-PLAN-audit-paridad-zmlash-geema.md`
- `plans/04-geema-migration/` (detalle del Plan 04)
- `plans/06-PLAN-preview-virtual-extensiones-ctwa.md`
- `plans/07-PLAN-look-preview-multi-servicio.md`
- `plans/07-anexo-prompts-vertex-v1.md`
- `plans/08-PLAN-comisiones-pagos.md`
- `plans/09-PLAN-landing-multitenant-fase1.md`
- `plans/10-PLAN-mi-web-cms-fase2.md`
- `plans/11-PLAN-waba-suite-parity.md`
- `plans/12-PLAN-panel-parity-zm-lash.md`
- `plans/13-PLAN-clientes-acciones-crm.md`

Carpetas históricas o espejadas:

- `plans/geema-migration/` — espejo temporal de ZM; no es un plan numerado independiente.

Documentación paralela:

- `ROADMAP.md`
- `GEEMASTUDIO_MIGRATION_GUIDE.md`
- `GEEMASTUDIO_V1.3_PLAN.md`
- `docs/audit/`
- `ZM_KNOWLEDGE.md`

## Numeración objetivo

La siguiente numeración es la propuesta canónica para GeemaStudio. Los números
actuales se conservarán temporalmente como alias en los encabezados y enlaces
históricos hasta completar la migración.

| Nuevo plan | Tema consolidado | Fuentes actuales |
|---|---|---|
| 01 | Monorepo y estructura | ZM/Geema Plan 01 |
| 02 | Multi-tenancy, `tenant_id` y RLS | ZM/Geema Plan 02 |
| 03 | Auditoría de paridad ZM Lash → Geema | ZM/Geema Plan 03 + `docs/audit/03` |
| 04 | Migración y convergencia ZM → Geema | Carpeta canónica `04-geema-migration/` |
| 05 | CTWA, collages y cierre por intención | ZM Plan 04 |
| 06 | Look Preview: spike y validación Vertex | ZM/Geema Plan 06 |
| 07 | Look Preview: producto multi-servicio | ZM/Geema Plan 07 + anexo Vertex |
| 08 | Modularización del dispatcher WABA | ZM Plan 08 |
| 09 | Comisiones y pagos | Geema Plan 08 |
| 10 | Landing pública multi-tenant | Geema Plan 09 |
| 11 | CMS Mi Web | Geema Plan 10 |
| 12 | Suite WABA y paridad conversacional | Geema Plan 11 + docs `waba/` de ZM |
| 13 | Paridad completa del panel | Geema Plan 12 |
| 14 | CRM y acciones de clientes | Geema Plan 13 + prompt de clientas de ZM |
| 15 | Retail, productos y `product_orders` | ZM/Geema `geema-migration/08` |

## Tratamiento por tipo de documento

### Migrar y consolidar

- Planes 01–03.
- Plan 04 de migración actual, incluyendo ADR, branding, paridad mobile,
  roadmap de sprints, bloqueadores y reconcile del webhook.
- ZM Plan 04 CTWA.
- ZM Plan 08 dispatcher.
- WABA capacity, simulación, lecciones y directrices de prompts.
- Edge Functions, despliegue y Vertex cuando describan capacidades que Geema
  debe absorber.

### Fusionar, no duplicar

- `docs/audit/03-AUDIT-paridad-zmlash-geema.md` con el brief del Plan 03:
  conservar el brief como alcance y el audit como resultado/versionado.
- `GEEMASTUDIO_MIGRATION_GUIDE.md` con el nuevo Plan 04:
  la guía debe quedar como histórico de implementación, no como roadmap activo.
- `GEEMASTUDIO_V1.3_PLAN.md` con el changelog/roadmap histórico:
  no debe continuar como plan vigente.
- `ZM_KNOWLEDGE.md` con documentación de arquitectura:
  conservar únicamente patrones todavía válidos y eliminar estados antiguos.

### Conservar como documentación de referencia

- Branding específico violeta/oro de ZM.
- Horarios, moneda, teléfonos, nombres y copy de Vanessa.
- Seeds y ejemplos específicos de ZM.
- Runbooks de operación que sigan siendo necesarios mientras el runtime WABA
  permanezca en ZM.

Estos documentos deben marcarse explícitamente como `tenant reference` o
`legacy`, no como especificación general de Geema.

### Retirar o dejar de actualizar

- Copias duplicadas de planes entre `docs/audit/` y `docs/geemastudio`.
- Estados de migración anteriores a la resolución de RLS, panel y push.
- Cualquier documento que describa como pendiente una capacidad ya cerrada en
  el changelog o en el código verificado.
- El sync bidireccional permanente después del cutover completo.

## Política de fuentes de verdad

### Durante la transición

1. Runtime WABA y Edge Functions productivas: ZM.
2. Panel, mobile, web y configuración multi-tenant: Geema.
3. Migración y decisiones compartidas: carpeta `04-geema-migration/`, con ZM como
   fuente temporal.
4. Cambios en documentos sincronizados: editar primero en ZM y ejecutar el
   script de sync, salvo una excepción documentada.

### Después del cutover

1. GeemaStudio será la fuente única de producto y operación.
2. Las Edge Functions migradas se documentarán en Geema.
3. ZM conservará documentación histórica y específica de `zm-lash-nails`.
4. Se retirará el sync ZM → Geema.
5. Las referencias activas a `ZM-Lash-and-Nails-Beauty` se limitarán a
   procedencia, compatibilidad o migración pendiente.

## Fases de ejecución

### Fase 1 — Congelar estructura

- No crear nuevos planes con la numeración actual.
- Añadir el nuevo plan al índice de consolidación antes de iniciar trabajo.
- Mantener enlaces antiguos funcionando durante la transición.

### Fase 2 — Consolidar contenido

- Crear las carpetas/nombres canónicos en Geema.
- Fusionar duplicados y conservar historial dentro de cada plan.
- Copiar únicamente la documentación ZM que describe capacidades generalizables.
- Marcar las reglas específicas de Vanessa como configuración de tenant.

### Fase 3 — Alinear ZM

- Actualizar `docs/INDEX.md` de ZM para apuntar a la estructura objetivo.
- Reemplazar la descripción de ZM como fuente permanente por “tenant de
  referencia durante la migración”.
- Mantener los enlaces operativos necesarios hasta completar el cutover.

### Fase 4 — Retirar el sync

- Verificar que runtime, crons, panel y documentación operativa ya viven en
  Geema.
- Ejecutar una última sincronización de cierre.
- Convertir `SYNC.md` en registro histórico.
- Eliminar el workflow de sync únicamente después de la confirmación del
  cutover.

## Criterio de finalización

La consolidación estará terminada cuando:

- Geema tenga una serie consecutiva sin huecos desde el Plan 01.
- Cada documento activo tenga una única ubicación canónica.
- No existan dos documentos activos describiendo el mismo estado.
- ZM no sea necesario como fuente de verdad para ninguna capacidad migrada.
- Los documentos específicos de ZM estén identificados como históricos o de
  configuración del tenant.
- Los enlaces antiguos y referencias de código hayan sido actualizados.
- El sync temporal pueda eliminarse sin perder conocimiento operativo.

