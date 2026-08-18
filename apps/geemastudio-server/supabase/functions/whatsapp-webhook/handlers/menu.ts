// handlers/menu.ts — Menú principal, categorías, servicios, promos y opciones de carrito

import { sendMessage, sendInteractiveList } from '../wa-api.ts'
import { formatMoney, LIST_TITLE_MAX } from '../format.ts'
import type { SupabaseClient } from '../lib/supabase.ts'
import { WA_IDS } from '../lib/wa-ids.ts'
import type { TenantWabaRecord } from '../lib/tenant-resolver.ts'
import type { WaSendConfig } from '../lib/tenant-config.ts'

export interface MenuCtx {
  supabase: SupabaseClient
  tenantId: string
  wa: WaSendConfig
  tenant: TenantWabaRecord
}

const TITLE_MAX_CHARS = LIST_TITLE_MAX
const DESCRIPTION_MAX_CHARS = 72

function listTitle(text: string | null | undefined): string {
  return (text ?? '').trim().slice(0, TITLE_MAX_CHARS)
}

export type UnasSubcategoryKey = 'clasicas' | 'polygel' | 'softgel' | 'acrilicas' | 'otros'

const UNAS_SUBCATEGORY_LABELS: Record<UnasSubcategoryKey, string> = {
  clasicas: 'Uñas clásicas y gel',
  polygel: 'Uñas PolyGel',
  softgel: 'Uñas Soft Gel',
  acrilicas: 'Uñas acrílicas',
  otros: 'Otros servicios de uñas',
}

export function classifyUnasService(nameRaw: string): UnasSubcategoryKey {
  const name = nameRaw.toLowerCase()
  if (name.includes('acríl') || name.includes('acril')) return 'acrilicas'
  if (name.includes('poly gel') || name.includes('polygel') || name.includes('polly gel'))
    return 'polygel'
  if (
    name.includes('soft gel') ||
    name.includes('softgel') ||
    (name.includes('soft') && name.includes('gel')) ||
    name.includes('tips')
  )
    return 'softgel'
  return 'clasicas'
}

export function getUnasSubcategoryLabel(key: UnasSubcategoryKey): string {
  return UNAS_SUBCATEGORY_LABELS[key] ?? UNAS_SUBCATEGORY_LABELS.clasicas
}

export type ExtensionesSubcategoryKey = 'extensiones_nuevas' | 'extensiones_retoques'

const EXTENSIONES_SUBCATEGORY_LABELS: Record<ExtensionesSubcategoryKey, string> = {
  extensiones_nuevas: 'Extensiones nuevas',
  extensiones_retoques: 'Retoques de extensiones',
}

export function classifyExtensionesService(nameRaw: string): ExtensionesSubcategoryKey {
  const name = nameRaw.toLowerCase()
  if (name.includes('retoque')) return 'extensiones_retoques'
  return 'extensiones_nuevas'
}

export function getExtensionesSubcategoryLabel(key: ExtensionesSubcategoryKey): string {
  return EXTENSIONES_SUBCATEGORY_LABELS[key] ?? EXTENSIONES_SUBCATEGORY_LABELS.extensiones_nuevas
}

export type SendMenuWithPromosOptions = {
  variant?: 'default' | 'after_meta_ads'
}

export async function sendMenuWithPromos(
  to: string,
  ctx: MenuCtx,
  opts?: SendMenuWithPromosOptions
) {
  const { supabase, tenantId, wa, tenant } = ctx
  const variant = opts?.variant ?? 'default'
  const brand = tenant.business_name
  const menuBody =
    variant === 'after_meta_ads'
      ? '¿Qué te gustaría hacer ahora? Toca *Ver opciones* y elige promos, servicios o agendar.'
      : `¡Hola! Bienvenida a *${brand}*.\n¿En qué podemos ayudarte hoy?`

  const now = new Date().toISOString()
  const { data: promosData } = await supabase
    .from('promotions')
    .select('title, badge')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .or(`expires_at.is.null,expires_at.gte.${now}`)
    .order('title', { ascending: true })
    .limit(3)

  const promos = promosData ?? []
  const hasPromos = promos.length > 0

  const promoDescription = hasPromos
    ? promos
        .slice(0, 2)
        .map((p: { title: string; badge: string | null }) =>
          [p.title, p.badge].filter(Boolean).join(' · ')
        )
        .join(' · ')
        .slice(0, DESCRIPTION_MAX_CHARS)
    : 'Promos activas y paquetes especiales'

  const ok = await sendInteractiveList(
    to,
    brand.slice(0, 60),
    menuBody,
    'Ver opciones',
    [
      {
        title: 'Servicios',
        rows: [
          {
            id: 'ver_promos',
            title: hasPromos ? 'Promos' : 'Promos',
            description: hasPromos
              ? promoDescription.slice(0, DESCRIPTION_MAX_CHARS)
              : promoDescription,
          },
          {
            id: 'ver_servicios',
            title: 'Ver servicios y packs',
            description: 'Servicios y paquetes con precios',
          },
          {
            id: 'agendar_cita',
            title: 'Agendar cita',
            description: 'Reserva tu próxima cita',
          },
        ],
      },
      {
        title: 'Información',
        rows: [
          {
            id: 'horarios',
            title: 'Horarios',
            description: 'Consulta horarios de atención',
          },
          {
            id: 'ubicacion',
            title: 'Ubicación',
            description: 'Cómo llegar al negocio',
          },
        ],
      },
    ],
    wa
  )

  if (!ok) {
    const fallbackIntro =
      variant === 'after_meta_ads'
        ? '¿Qué te gustaría hacer ahora?\n\n'
        : `¡Hola! Bienvenida a *${brand}*.\n\n`
    await sendMessage(
      to,
      fallbackIntro +
        '1️⃣ Promos\n' +
        '2️⃣ Ver servicios y packs\n' +
        '3️⃣ Agendar cita\n' +
        '4️⃣ Horarios\n' +
        '5️⃣ Ubicación\n\n' +
        'Responde con el número y te muestro el menú interactivo.',
      wa
    )
  }
}

export async function sendCategoriesList(
  to: string,
  categories: { id: string; name: string }[],
  wa: WaSendConfig
) {
  const mainCats = categories.filter((c) => c.id.startsWith('cat-'))
  const displayCats = mainCats.length > 0 ? mainCats : categories

  const rows = displayCats.map((c) => {
    const name = c.name.trim()
    const title = name.slice(0, TITLE_MAX_CHARS)
    const baseDesc = 'Ver servicios de esta categoría'
    const description =
      name.length > TITLE_MAX_CHARS
        ? `${name} — ${baseDesc}`.slice(0, DESCRIPTION_MAX_CHARS)
        : baseDesc
    return {
      id: `${WA_IDS.CATEGORY_PREFIX}${c.id}`,
      title,
      description,
    }
  })
  const fallback = displayCats.map((c) => `• ${c.name}`).join('\n')
  const ok = await sendInteractiveList(
    to,
    'Categorías',
    `Selecciona una categoría:\n\n${fallback}`,
    'Ver categorías',
    [{ title: 'Elige una categoría', rows }],
    wa
  )
  if (!ok) {
    await sendMessage(
      to,
      'Te muestro nuestras categorías:\n\n' +
        `${fallback}\n\n` +
        'Si no ves los botones interactivos, responde con *menu* para volver al inicio y reintentar.',
      wa
    )
  }
}

export async function sendCategoriesAndPromosListFromCatalog(
  to: string,
  categories: { id: string; name: string }[],
  hasPromos: boolean,
  wa: WaSendConfig
) {
  const mainCats = categories.filter((c) => c.id.startsWith('cat-'))
  const displayCats = mainCats.length > 0 ? mainCats : categories

  const categoryRows = displayCats.map((c) => {
    const name = c.name.trim()
    const title = listTitle(name)
    const baseDesc = 'Ver servicios de esta categoría'
    const description =
      name.length > TITLE_MAX_CHARS
        ? `${name} — ${baseDesc}`.slice(0, DESCRIPTION_MAX_CHARS)
        : baseDesc
    return {
      id: `${WA_IDS.CATEGORY_PREFIX}${c.id}`,
      title,
      description,
    }
  })

  const sections: {
    title: string
    rows: { id: string; title: string; description: string }[]
  }[] = []

  if (hasPromos) {
    sections.push({
      title: 'Promos',
      rows: [
        {
          id: 'ver_promos',
          title: 'Promos',
          description: 'Ver promos activas',
        },
      ],
    })
  }

  sections.push({
    title: 'Categorías',
    rows: categoryRows,
  })

  const fallback =
    (hasPromos ? '• Promos\n' : '') + displayCats.map((c) => `• ${c.name}`).join('\n')

  const ok = await sendInteractiveList(
    to,
    'Agregar más servicios',
    'Puedes elegir una promo o una categoría:\n\n' + fallback,
    'Ver opciones',
    sections,
    wa
  )

  if (!ok) {
    await sendMessage(
      to,
      'Opciones para agregar más:\n\n' +
        fallback +
        '\n\nResponde *menu* para volver al inicio o elige una categoría.',
      wa
    )
  }
}

function dedupeServicesByIdentity<
  T extends { id: string; name: string; price: string; duration: number },
>(services: T[]): T[] {
  const seen = new Set<string>()
  return services.filter((s) => {
    const key = `${s.name.trim().toLowerCase()}|${String(s.price)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function sendUnasSubcategoriesList(
  to: string,
  services: {
    id: string
    name: string
    price: string
    duration: number
    subcategory?: string | null
  }[],
  wa: WaSendConfig
) {
  const groups: Record<
    UnasSubcategoryKey,
    {
      id: string
      name: string
      price: string
      duration: number
      subcategory?: string | null
    }[]
  > = {
    clasicas: [],
    polygel: [],
    softgel: [],
    acrilicas: [],
    otros: [],
  }

  const validKeys: UnasSubcategoryKey[] = ['clasicas', 'polygel', 'softgel', 'acrilicas', 'otros']

  for (const svc of services) {
    const raw = (svc.subcategory ?? '').toLowerCase()
    const fromDb = validKeys.find((k) => k === raw) ?? null
    const key = fromDb ?? classifyUnasService(svc.name)
    groups[key].push(svc)
  }

  const rows = (Object.keys(groups) as UnasSubcategoryKey[])
    .filter((key) => groups[key].length > 0)
    .map((key) => {
      const list = groups[key]
      const example = list[0]?.name ?? ''
      const count = list.length
      const title = listTitle(getUnasSubcategoryLabel(key))
      const descriptionSource =
        (example ? `${example} · ` : '') + `${count} servicio${count > 1 ? 's' : ''}`
      return {
        id: `${WA_IDS.SUBCATEGORY_PREFIX}cat-unas__${key}`,
        title,
        description: descriptionSource.slice(0, DESCRIPTION_MAX_CHARS),
      }
    })

  const fallbackLines = rows.map((row) => `• ${row.title} (${row.description})`).join('\n')

  const ok = await sendInteractiveList(
    to,
    'Uñas',
    'Puedes elegir una subcategoría de Uñas para ver servicios más específicos:\n\n' +
      fallbackLines,
    'Ver subcategorías',
    [
      {
        title: 'Subcategorías Uñas',
        rows,
      },
    ],
    wa
  )

  if (!ok) {
    await sendMessage(
      to,
      'Te muestro subcategorías de Uñas:\n\n' +
        fallbackLines +
        '\n\nEscribe *menu* para volver al inicio si no ves los botones interactivos.',
      wa
    )
  }
}

export async function sendExtensionesSubcategoriesList(
  to: string,
  services: {
    id: string
    name: string
    price: string
    duration: number
    subcategory?: string | null
  }[],
  wa: WaSendConfig
) {
  const groups: Record<ExtensionesSubcategoryKey, typeof services> = {
    extensiones_nuevas: [],
    extensiones_retoques: [],
  }
  const validKeys: ExtensionesSubcategoryKey[] = ['extensiones_nuevas', 'extensiones_retoques']
  for (const svc of services) {
    const raw = (svc.subcategory ?? '').toLowerCase()
    const fromDb = validKeys.find((k) => k === raw) ?? null
    const key = fromDb ?? classifyExtensionesService(svc.name)
    groups[key].push(svc)
  }

  const rows = (Object.keys(groups) as ExtensionesSubcategoryKey[])
    .filter((key) => groups[key].length > 0)
    .map((key) => {
      const list = groups[key]
      const count = list.length
      const title = listTitle(getExtensionesSubcategoryLabel(key))
      const description = `${count} servicio${count > 1 ? 's' : ''} disponibles`
      return {
        id: `${WA_IDS.SUBCATEGORY_PREFIX}cat-extensiones__${key}`,
        title,
        description,
      }
    })

  const fallbackLines = rows.map((r) => `• ${r.title}`).join('\n')
  const ok = await sendInteractiveList(
    to,
    'Extensiones de Pestañas',
    'Elige una subcategoría:\n\n' + fallbackLines,
    'Ver subcategorías',
    [{ title: 'Subcategorías Extensiones', rows }],
    wa
  )
  if (!ok) {
    await sendMessage(
      to,
      'Te muestro subcategorías de Extensiones:\n\n' +
        fallbackLines +
        '\n\nEscribe *menu* para volver al inicio si no ves los botones.',
      wa
    )
  }
}

export type PackForList = {
  id: string
  title: string
  short_name?: string | null
  pack_price: string
}

export async function sendServicesList(
  to: string,
  categoryName: string,
  services: {
    id: string
    name: string
    short_name?: string | null
    price: string
    duration: number
  }[],
  wa: WaSendConfig,
  currencyCode: string,
  preserveDuplicates = false,
  packs: PackForList[] = []
) {
  const list = preserveDuplicates ? services : dedupeServicesByIdentity(services)
  const sortedSvcs = [...list].sort((a, b) => a.name.trim().localeCompare(b.name.trim()))

  const WA_MAX_ROWS = 10
  const packRows = packs.slice(0, WA_MAX_ROWS).map((p) => {
    const name = (p.short_name || p.title).trim()
    const priceNumber = parseFloat(String(p.pack_price)) || 0
    return {
      id: `${WA_IDS.PACK_PREFIX}${p.id}`,
      title: listTitle(name),
      description: `${name} — ${formatMoney(priceNumber, currencyCode)}`.slice(
        0,
        DESCRIPTION_MAX_CHARS
      ),
    }
  })
  const remaining = WA_MAX_ROWS - packRows.length
  const limitedSvcs = sortedSvcs.slice(0, remaining)
  const serviceRows = limitedSvcs.map((s, index) => {
    const name = s.name.trim()
    const priceNumber = parseFloat(String(s.price)) || 0
    const priceLine = `${formatMoney(priceNumber, currencyCode)} | ${s.duration} min`
    const rowId = preserveDuplicates
      ? `${WA_IDS.SERVICE_PREFIX}${s.id}_i${index}`
      : `${WA_IDS.SERVICE_PREFIX}${s.id}`
    const title = listTitle(s.short_name ?? name)
    const descriptionSource = `${name} — ${priceLine}`
    const description = descriptionSource.slice(0, DESCRIPTION_MAX_CHARS)
    return { id: rowId, title, description }
  })

  const rows = [...packRows, ...serviceRows]
  const fallback = [
    ...packs.map((p) => {
      const pN = parseFloat(String(p.pack_price)) || 0
      return `${(p.short_name || p.title).trim()} — ${formatMoney(pN, currencyCode)}`
    }),
    ...list.map((s) => {
      const pN = parseFloat(String(s.price)) || 0
      return `${s.name.trim()} — ${formatMoney(pN, currencyCode)}`
    }),
  ].join('\n')

  const ok = await sendInteractiveList(
    to,
    categoryName,
    `Servicios y packs de ${categoryName}:`,
    'Ver opciones',
    [{ title: listTitle(categoryName), rows }],
    wa
  )
  if (!ok) {
    await sendMessage(
      to,
      `*${categoryName}:*\n\n${fallback}\n\n` +
        'Si no ves los botones, responde con *menu* para volver al inicio.',
      wa
    )
  }
}

export type PromoForList = {
  id: string
  title: string
  description: string | null
  emoji: string
  badge: string | null
}

export async function sendPromosListFromCatalog(
  to: string,
  promos: PromoForList[],
  wa: WaSendConfig
) {
  if (!promos.length) {
    await sendMessage(
      to,
      'Ahorita no hay promos activas. Puedes ver los servicios en el menú principal.',
      wa
    )
    return
  }
  const rows = promos.slice(0, 10).map((p: PromoForList) => {
    const prefix = p.emoji ? `${p.emoji} ` : ''
    const fullName = `${prefix}${p.title}`
    const title = listTitle(fullName)
    const description = (p.description ?? fullName).trim().slice(0, DESCRIPTION_MAX_CHARS)
    return {
      id: `promo_${p.id}`,
      title,
      description: description || fullName.slice(0, DESCRIPTION_MAX_CHARS),
    }
  })
  const fallback = promos
    .map((p: PromoForList) => `*${p.title}*\n  ${(p.description ?? '').trim() || 'Ver ítems'}`)
    .join('\n\n')
  const ok = await sendInteractiveList(
    to,
    'Promos',
    'Promos activas — elige una para ver los ítems y precios:',
    'Ver promos',
    [{ title: 'Promos activas', rows }],
    wa
  )
  if (!ok) {
    await sendMessage(
      to,
      `*Promos activas:*\n\n${fallback}\n\n` +
        'Escribe *agendar* para reservar o *menu* para más opciones.',
      wa
    )
  }
}

export type SendCartOptionsOpts = {
  bodyOverride?: string
  headerOverride?: string
}

export async function sendCartOptions(
  to: string,
  summary: string,
  hasItems: boolean,
  wa: WaSendConfig,
  opts?: SendCartOptionsOpts
) {
  const rows = [
    {
      id: WA_IDS.AGREGAR_OTRO,
      title: 'Agregar otro servicio',
      description: 'Elegir más servicios',
    },
    ...(hasItems
      ? [
          {
            id: WA_IDS.VER_SELECCION,
            title: 'Ver mi selección',
            description: 'Revisar servicios elegidos',
          },
        ]
      : []),
    ...(hasItems
      ? [
          {
            id: WA_IDS.AGENDAR_YA,
            title: 'Agendar cita',
            description: 'Reservar con los servicios elegidos',
          },
          {
            id: WA_IDS.VACIAR_CARRITO,
            title: 'Vaciar carrito',
            description: 'Eliminar todo y empezar de cero',
          },
        ]
      : []),
  ]
  const body =
    opts?.bodyOverride !== undefined
      ? opts.bodyOverride
      : hasItems
        ? `${summary}\n\n¿Qué deseas hacer?`
        : '¿Qué deseas hacer?'
  const header = opts?.headerOverride ?? 'Servicio agregado'
  const ok = await sendInteractiveList(
    to,
    header,
    body,
    'Opciones',
    [{ title: 'Acciones', rows }],
    wa
  )
  if (!ok)
    await sendMessage(
      to,
      hasItems
        ? `${summary}\n\nEscribe *agregar* para más o *agendar* para reservar.`
        : 'Escribe *agregar* para más o *agendar* para reservar.',
      wa
    )
}
