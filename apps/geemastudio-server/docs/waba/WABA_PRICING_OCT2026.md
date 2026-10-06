# WABA — Cambio de pricing Meta (1-oct-2026)

> Objetivo de este doc: que un agente (Claude Code u otro) no repita el error de
> sumar categorías de `waba_pricing_daily` que no se deben sumar, y no lance
> alertas de costo falsas. Incidente real: 28-sep-2026, ver [Hallazgo corregido](#hallazgo-corregido-28-sep-2026).

## Qué cambia el 1-oct-2026 (confirmado vía Meta Developer Docs + prensa especializada)

- Los **mensajes de servicio** (respuesta de texto libre dentro de la ventana de
  atención al cliente de 24h) pasan a cobrarse por mensaje, a la tarifa
  UTILITY/AUTHENTICATION del mercado (Perú), **después de un allowance gratuito
  de 1,000 mensajes de servicio/mes por número de teléfono del negocio**. Sin
  rollover, se resetea cada mes.
- Las plantillas UTILITY enviadas **dentro** de una ventana de servicio ya
  abierta también empiezan a cobrarse (antes eran gratis en ese escenario).
- **La ventana de atención al cliente sigue siendo de 24h** — eso no cambia.
- **Excepción real de 72h — Free Entry Point (FEP)**: cuando una clienta llega
  por un anuncio "Click to WhatsApp" o un botón de WhatsApp en una página de
  Facebook, y el negocio responde dentro de las primeras 24h, se abre una
  **ventana de 72h de conversación 100% gratis** (no 24h). Esta ventana FEP
  **no cambia con el pricing de octubre** y **no cuenta** contra el allowance
  de 1,000 mensajes/mes — sigue gratis siempre, por diseño de Meta para tráfico
  de anuncios.
- Método de pago cargado en Meta Business Manager antes del 30-sep-2026: si no
  hay tarjeta, Meta **deja de entregar mensajes de servicio** apenas empiece a
  cobrar (no solo sube el costo, corta el bot). **Confirmado 28-sep-2026 por
  Alberto: la tarjeta ya está cargada** (la misma que se usa para Meta Ads,
  cuenta `act_2097809460557755`).

Sources: [Meta Developer Docs — Pricing on the WhatsApp Business Platform](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing) · [Meta Developer Docs — Upcoming pricing updates for service and utility messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/non-template-messages) · [Courier — WhatsApp pricing changes: October 1, 2026](https://www.courier.com/blog/whatsapp-pricing-changes-october-2026) · [respond.io — WhatsApp Pricing Change 2026](https://respond.io/blog/whatsapp-pricing-change-2026) · [360Dialog — Service Message Charging Starts October 1, 2026](https://360dialog.com/blog/whatsapp-service-message-charging-october-2026/)

## Cómo leer `waba_pricing_daily` sin inflar el volumen

La tabla trae `pricing_category` + `pricing_type` + `country_code` por fila/día.
**No sumar todo `pricing_category = 'SERVICE'` como si fuera volumen facturable**
— mezcla cosas con reglas de costo opuestas:

| `pricing_type` dentro de `SERVICE` | ¿Cuenta contra las 1,000 gratis/mes? | Qué es en realidad |
|---|---|---|
| `FREE_ENTRY_POINT` | **No, nunca** | Ventana FEP de 72h — primer contacto por anuncio CTWA/CTA de Facebook Page |
| `FREE_CUSTOMER_SERVICE` | **Sí** | Conversación de servicio real dentro de la ventana de 24h — esto es lo único que hay que vigilar |

El campo `country_code` **no es confiable** para identificar clientas reales:
filas con `country_code = 'VE'` (~28-sep-2026) resultaron ser leads que llegan
por clic en anuncio, con `phone` tipo `PE.1055813927055190` en `wa_messages`
(pseudo-ID que asigna Meta antes de resolver el número real de WhatsApp) —
Meta les pone mal la bandera de país, pero el `pricing_type` (`FREE_CUSTOMER_SERVICE`)
sí es correcto y por lo tanto **sí cuenta** contra el allowance, sin importar
el país que diga la fila.

**Query correcta para ver el volumen que realmente importa** (mensajes de
servicio real, por mes):

```sql
select date_trunc('month', date)::date as mes, sum(volume) as service_real_volume
from waba_pricing_daily
where pricing_category = 'SERVICE'
  and pricing_type = 'FREE_CUSTOMER_SERVICE'
group by 1
order by 1;
```

## Hallazgo corregido (28-sep-2026)

Primera pasada (incorrecta): sumé `SERVICE` completo (`FREE_ENTRY_POINT` +
`FREE_CUSTOMER_SERVICE` sin distinguir) → 2,340-2,540 msgs/mes ago/sep, sonaba
como que ZM ya excedía por 2x+ el allowance de 1,000. **Alberto notó que el
número no cuadraba** ("no me cuadra para nada") — correcto: la mayoría de ese
volumen (1,911/30d) es `FREE_ENTRY_POINT`, que nunca se cobra.

Segunda pasada (correcta), volumen real de `FREE_CUSTOMER_SERVICE` por mes:

| Mes | Mensajes de servicio real (cuentan contra las 1,000 gratis) |
|---|---|
| jul-2026 | 93 |
| ago-2026 | 275 |
| sep-2026 | 697 |

**Conclusión**: ZM está **por debajo** de las 1,000 gratis/mes, no por encima.
Pero la tendencia casi se triplica mes a mes (93→275→697) — si sigue esa curva,
octubre o noviembre podría cruzar las 1,000 y ahí sí empezar a generar costo
real (tarifa utility/auth Perú, ~$0.02-0.08/msg según lo que ya se ve pagado
en filas `UTILITY` de la misma tabla). Vale la pena re-chequear con la query
de arriba a mediados de octubre.

## Para el agente que retome esto

- Antes de alertar sobre "volumen que excede el free tier", correr la query de
  arriba — no un `sum(volume)` crudo por `pricing_category`.
- El WABA (`+51 981 444 430`, `tenant_waba_numbers` seed ZM) es compartido hoy
  entre ZM Lash & Nails (este repo) y Geema (zm-tech) — mismo `waba_pricing_daily`,
  no hay `tenant_id` en esa tabla todavía. Este doc aplica a ambos repos; puntero
  corto en zm-tech: `docs/geemastudio/docs/WABA_PRICING_OCT2026_ZM.md`.
- Tarjeta de facturación Meta: confirmada por Alberto, no requiere seguimiento
  salvo que cambie de cuenta/tarjeta.
