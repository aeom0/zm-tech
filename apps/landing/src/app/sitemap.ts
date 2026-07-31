import type { MetadataRoute } from 'next'

const site = 'https://zmtechdev.com'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${site}/es`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
      alternates: {
        languages: {
          es: `${site}/es`,
          en: `${site}/en`,
        },
      },
    },
    {
      url: `${site}/en`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
      alternates: {
        languages: {
          es: `${site}/es`,
          en: `${site}/en`,
        },
      },
    },
    {
      url: `${site}/es/cotizador`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
      alternates: {
        languages: {
          es: `${site}/es/cotizador`,
          en: `${site}/en/cotizador`,
        },
      },
    },
    {
      url: `${site}/en/cotizador`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
      alternates: {
        languages: {
          es: `${site}/es/cotizador`,
          en: `${site}/en/cotizador`,
        },
      },
    },
  ]
}
