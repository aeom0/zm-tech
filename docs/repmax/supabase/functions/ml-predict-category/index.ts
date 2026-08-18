import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { jsonResponse, optionsResponse } from '../_shared/cors.ts'
import { ensureValidAccessToken, mlGet } from '../_shared/ml.ts'
import { adminClient, requireStoreMember, userFromJwt } from '../_shared/supabase.ts'

type MlTag = 'required' | 'new_required' | 'conditional_required' | 'optional'

interface MlRawAttribute {
  id: string
  name: string
  value_id?: string
  value_name?: string
  tags?: Record<string, unknown>
}

interface MlRawPrediction {
  domain_id: string
  domain_name: string
  category_id: string
  category_name: string
  attributes?: MlRawAttribute[]
}

interface MlAttributeOut {
  id: string
  name: string
  valueId?: string
  valueName?: string
  tag: MlTag
}

function tagFromMl(tags: Record<string, unknown> | undefined): MlTag {
  if (!tags) return 'optional'
  if (tags.required === true) return 'required'
  if (tags.new_required === true) return 'new_required'
  if (tags.conditional_required === true) return 'conditional_required'
  return 'optional'
}

function isRequired(tag: MlTag): boolean {
  return tag === 'required' || tag === 'new_required' || tag === 'conditional_required'
}

function mapAttr(raw: MlRawAttribute): MlAttributeOut {
  const attr: MlAttributeOut = {
    id: raw.id,
    name: raw.name,
    tag: tagFromMl(raw.tags),
  }
  if (raw.value_id) attr.valueId = raw.value_id
  if (raw.value_name) attr.valueName = raw.value_name
  return attr
}

async function attributesForCategory(
  categoryId: string,
  accessToken: string,
  predicted: MlRawAttribute[] | undefined
): Promise<MlAttributeOut[]> {
  const raw = await mlGet<MlRawAttribute[]>(
    `/categories/${encodeURIComponent(categoryId)}/attributes`,
    accessToken
  )
  const predictedById = new Map((predicted ?? []).map((a) => [a.id, a]))
  return raw
    .map((item) => {
      const overlay = predictedById.get(item.id)
      return mapAttr({
        ...item,
        value_id: overlay?.value_id ?? item.value_id,
        value_name: overlay?.value_name ?? item.value_name,
      })
    })
    .filter((attr) => isRequired(attr.tag))
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return optionsResponse()
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Usa POST.' }, 405)
  }

  try {
    const user = await userFromJwt(req)
    const body = (await req.json()) as {
      storeId?: string
      title?: string
      siteId?: string
      categoryId?: string
    }
    const storeId = body.storeId?.trim()
    if (!storeId) return jsonResponse({ error: 'Falta storeId.' }, 400)

    const admin = adminClient()
    await requireStoreMember(admin, user.id, storeId)
    const { accessToken, siteId } = await ensureValidAccessToken(admin, storeId)
    const site = body.siteId?.trim() || siteId

    if (body.categoryId?.trim()) {
      const attributes = await attributesForCategory(body.categoryId.trim(), accessToken, undefined)
      return jsonResponse({ attributes })
    }

    const title = body.title?.trim()
    if (!title) return jsonResponse({ error: 'Falta el título para predecir.' }, 400)

    const q = encodeURIComponent(title)
    const predictions = await mlGet<MlRawPrediction[]>(
      `/sites/${encodeURIComponent(site)}/domain_discovery/search?limit=3&q=${q}`,
      accessToken
    )

    const out = []
    for (let i = 0; i < predictions.length; i++) {
      const p = predictions[i]
      const attributes = await attributesForCategory(p.category_id, accessToken, p.attributes)
      out.push({
        domainId: p.domain_id,
        domainName: p.domain_name,
        categoryId: p.category_id,
        categoryName: p.category_name,
        attributes,
        confidenceRank: i + 1,
      })
    }

    return jsonResponse({ predictions: out })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo predecir la categoría.'
    return jsonResponse({ error: message }, 400)
  }
})
