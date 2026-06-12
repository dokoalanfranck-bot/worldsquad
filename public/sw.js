// WorldSquad Service Worker v2
const CACHE_NAME = 'worldsquad-v2'
const OFFLINE_URL = '/'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll([OFFLINE_URL, '/manifest.webmanifest']).catch(() => {}))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  // Skip non-GET, cross-origin, API and admin routes
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) return

  // Network-first for navigation (SSR pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL).then((r) => r || Response.error())))
    return
  }

  // Cache-first for Next.js static bundles only
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((res) => {
          if (res.ok) { const clone = res.clone(); caches.open(CACHE_NAME).then((c) => c.put(event.request, clone)) }
          return res
        })
      })
    )
  }
})

self.addEventListener('push', (event) => {
  if (!event.data) return
  let p; try { p = event.data.json() } catch { p = { title: 'WorldSquad', body: event.data.text() } }
  event.waitUntil(self.registration.showNotification(p.title || 'WorldSquad', { body: p.body || '', icon: '/api/icons/192', data: p.url || '/', vibrate: [100, 50, 100] }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data || '/'
  event.waitUntil(clients.matchAll({ type: 'window' }).then((ws) => { for (const w of ws) { if (w.url === url && 'focus' in w) return w.focus() } if (clients.openWindow) return clients.openWindow(url) }))
})
