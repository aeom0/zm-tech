import type { MetadataRoute } from 'next'

const site = 'https://zmtechdev.com'

function localizedEntry(
  path: string,
  priority: number,
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
): MetadataRoute.Sitemap {
  const es = `${site}/es${path}`
  const en = `${site}/en${path}`
  return [
    {
      url: es,
      lastModified: new Date(),
      changeFrequency,
      priority,
      alternates: { languages: { es, en } },
    },
    {
      url: en,
      lastModified: new Date(),
      changeFrequency,
      priority,
      alternates: { languages: { es, en } },
    },
  ]
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...localizedEntry('', 1, 'weekly'),
    ...localizedEntry('/cotizador', 0.8, 'weekly'),
    ...localizedEntry('/privacidad', 0.3, 'yearly'),
    ...localizedEntry('/terminos', 0.3, 'yearly'),
  ]
}
