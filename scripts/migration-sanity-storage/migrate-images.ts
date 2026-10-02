import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://udelxwwnyivknslueerr.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Falta SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const TMP_DIR = '/tmp/sanity-migration'

if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true })
}

async function uploadToStorage(url: string, folder: string, namePrefix: string): Promise<string> {
  const ts = Date.now()
  const random = Math.floor(Math.random() * 1000)
  const tmpOriginal = path.join(TMP_DIR, `${namePrefix}_${ts}_${random}_orig`)
  const tmpWebp = path.join(TMP_DIR, `${namePrefix}_${ts}_${random}.webp`)

  console.log(`Descargando: ${url}`)
  execSync(`curl -s -L "${url}" -o "${tmpOriginal}"`)

  console.log(`Convirtiendo a webp: ${tmpOriginal} -> ${tmpWebp}`)
  execSync(`convert "${tmpOriginal}" -quality 85 "${tmpWebp}"`)

  const fileBuffer = fs.readFileSync(tmpWebp)
  const storagePath = `zm-lash-nails/${folder}/${ts}_${random}.webp`

  console.log(`Subiendo a Storage: web-assets/${storagePath}`)
  const { error } = await supabase.storage
    .from('web-assets')
    .upload(storagePath, fileBuffer, {
      contentType: 'image/webp',
      cacheControl: '31536000',
      upsert: true,
    })

  if (error) {
    throw new Error(`Error subiendo a Storage ${storagePath}: ${error.message}`)
  }

  // Limpieza temporal
  try {
    fs.unlinkSync(tmpOriginal)
    fs.unlinkSync(tmpWebp)
  } catch {}

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/web-assets/${storagePath}`
  console.log(`Listo: ${publicUrl}`)
  return publicUrl
}

async function run() {
  console.log('--- Iniciando migración de imágenes de Sanity a Supabase Storage ---')

  const { data: row, error: fetchErr } = await supabase
    .from('tenant_settings')
    .select('web_gallery, web_team, web_promos, web_promo_banner_url')
    .eq('tenant_slug', 'zm-lash-nails')
    .single()

  if (fetchErr || !row) {
    console.error('Error obteniendo tenant_settings:', fetchErr)
    process.exit(1)
  }

  // Backup local por seguridad
  fs.writeFileSync(
    path.join(process.cwd(), 'scripts/migration-sanity-storage/backup-zm-lash-web.json'),
    JSON.stringify(row, null, 2)
  )
  console.log('Backup guardado en backup-zm-lash-web.json')

  // 1. Galería (14 imágenes)
  const gallery = (row.web_gallery || []) as Array<{ alt: string; url: string; category: string }>
  console.log(`\nProcesando galería (${gallery.length} items)...`)
  const newGallery = []
  for (let i = 0; i < gallery.length; i++) {
    const item = gallery[i]
    if (item.url && item.url.includes('cdn.sanity.io')) {
      const newUrl = await uploadToStorage(item.url, 'gallery', `gal_${i + 1}`)
      newGallery.push({ ...item, url: newUrl })
    } else {
      newGallery.push(item)
    }
  }

  // 2. Equipo (2 imágenes)
  const team = (row.web_team || []) as Array<{
    name: string
    role: string
    color: string
    phrase: string
    photoUrl: string
    speciality: string
  }>
  console.log(`\nProcesando equipo (${team.length} items)...`)
  const newTeam = []
  for (let i = 0; i < team.length; i++) {
    const member = team[i]
    if (member.photoUrl && member.photoUrl.includes('cdn.sanity.io')) {
      const newUrl = await uploadToStorage(member.photoUrl, 'team', `team_${member.name.toLowerCase()}`)
      newTeam.push({ ...member, photoUrl: newUrl })
    } else {
      newTeam.push(member)
    }
  }

  // 3. Promociones (4 imágenes)
  const promos = (row.web_promos || []) as Array<{
    badge: string
    title: string
    ctaText: string
    imageUrl: string
    badgeColor: string
    whatsappMessage: string
  }>
  console.log(`\nProcesando promociones (${promos.length} items)...`)
  const newPromos = []
  for (let i = 0; i < promos.length; i++) {
    const promo = promos[i]
    if (promo.imageUrl && promo.imageUrl.includes('cdn.sanity.io')) {
      const newUrl = await uploadToStorage(promo.imageUrl, 'promos', `promo_${i + 1}`)
      newPromos.push({ ...promo, imageUrl: newUrl })
    } else {
      newPromos.push(promo)
    }
  }

  // 4. Banner de promoción (1 imagen)
  let newBannerUrl = row.web_promo_banner_url
  console.log('\nProcesando banner de promoción...')
  if (row.web_promo_banner_url && row.web_promo_banner_url.includes('cdn.sanity.io')) {
    newBannerUrl = await uploadToStorage(row.web_promo_banner_url, 'banner', 'promo_banner')
  }

  console.log('\n--- Actualizando tenant_settings en Supabase ---')
  const { error: updateErr } = await supabase
    .from('tenant_settings')
    .update({
      web_gallery: newGallery,
      web_team: newTeam,
      web_promos: newPromos,
      web_promo_banner_url: newBannerUrl,
    })
    .eq('tenant_slug', 'zm-lash-nails')

  if (updateErr) {
    console.error('Error actualizando tenant_settings:', updateErr)
    process.exit(1)
  }

  console.log('¡Migración de imágenes completada con éxito!')
}

run().catch((err) => {
  console.error('Error fatal:', err)
  process.exit(1)
})
