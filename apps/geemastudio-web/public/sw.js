// Service Worker para GeemaStudio PWA
const CACHE_NAME = 'geema-pwa-v2'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      })
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  // Ignorar navegaciones (el SW no debe interferir con redirects/auth), API,
  // manifest, peticiones externas y WebSocket
  if (
    event.request.mode === 'navigate' ||
    url.pathname.startsWith('/api') ||
    url.pathname.endsWith('.webmanifest') ||
    url.origin !== self.location.origin
  ) {
    return
  }

  // Network-first con guardado de recursos estáticos
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (
          response.status === 200 &&
          (url.pathname.startsWith('/_next/static') ||
            url.pathname.endsWith('.png') ||
            url.pathname.endsWith('.svg') ||
            url.pathname.endsWith('.woff2'))
        ) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })
        }
        return response
      })
      .catch(async () => {
        const cached = await caches.match(event.request)
        return cached || Response.error()
      })
  )
})
