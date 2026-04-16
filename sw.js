/* ============================================================
   GERIBAND — Service Worker
   ------------------------------------------------------------
   🔁 CACHE BUSTING: bump BUILD_ID on every deploy.
      When BUILD_ID changes, CACHE_NAME changes → old caches are
      automatically deleted on activate, and clients reload.
   ============================================================ */

const BUILD_ID   = '2026.04.16.2';
const CACHE_NAME = `geriband-${BUILD_ID}`;

const PRECACHE = [
  './',
  './index.html',
  './dashboard.html',
  './auth.html',
  './manifest.json',
  './assets/style.css',
  './assets/index.css',
  './assets/favicon.ico',
  './assets/icon.png',
  './assets/icon-16.png',
  './assets/icon-32.png',
  './assets/icon-48.png',
  './assets/icon-72.png',
  './assets/icon-96.png',
  './assets/icon-128.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './script/i18n.js',
  './script/app.js',
  './script/auth.js',
  './script/ble.js',
  './script/firebase-config.local.js',
  './script/firebase-config.js',
  './script/notifications.js',
  './script/dashboard.js',
  './script/monitor.js',
  './script/history.js',
  './script/device.js',
  './script/settings.js',
];

/* ── Install: pre-cache & skip waiting ─────────────────────── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE).catch(() => {/* don't block install on a single 404 */}))
      .then(() => self.skipWaiting())
  );
});

/* ── Activate: purge ALL old caches, claim every open tab ── */
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
    // Notify open tabs that a new version is now controlling them
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(c => c.postMessage({ type: 'SW_ACTIVATED', buildId: BUILD_ID }));
  })());
});

/* ── Message bus ─────────────────────────────────────────── */
self.addEventListener('message', event => {
  const msg = event.data || {};

  // Triggered by page when new SW is installed but still waiting
  if (msg.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  // Report current build id (for manual version checks)
  if (msg.type === 'GET_BUILD_ID') {
    event.ports[0]?.postMessage({ buildId: BUILD_ID });
    return;
  }

  // Force-purge all caches (safety hatch from the page)
  if (msg.type === 'PURGE_CACHES') {
    event.waitUntil(
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
    );
    return;
  }

  // Show local notification (existing flow)
  if (msg.type === 'SHOW_NOTIFICATION') {
    const opts = msg.payload || {};
    event.waitUntil(
      self.registration.showNotification(opts.title, {
        body:               opts.body,
        icon:               opts.icon || './assets/icon-192.png',
        badge:              opts.badge || './assets/badge-72.png',
        tag:                opts.tag,
        renotify:           opts.renotify,
        requireInteraction: opts.requireInteraction,
        vibrate:            opts.vibrate,
        data:               opts.data,
        actions:            opts.actions,
      })
    );
  }
});

/* ── Fetch strategy ──────────────────────────────────────────
   • HTML (navigate)          → NETWORK-FIRST   (always try fresh)
   • Script/style (js, css)   → NETWORK-FIRST   (same origin only)
   • Icons/images             → CACHE-FIRST     (immutable-ish)
   • Cross-origin (Firebase, fonts) → let the browser handle
   ─────────────────────────────────────────────────────────── */
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (!url.protocol.startsWith('http')) return;
  // Pass-through for cross-origin (Google Fonts, Firebase CDN, etc.)
  if (url.origin !== self.location.origin) return;

  const isHTML   = req.mode === 'navigate' ||
                   (req.headers.get('accept') || '').includes('text/html');
  const isCode   = /\.(?:js|css|json)$/i.test(url.pathname);
  const isAsset  = /\.(?:png|jpg|jpeg|svg|ico|webp|gif|woff2?|ttf)$/i.test(url.pathname);

  if (isHTML || isCode)      event.respondWith(networkFirst(req));
  else if (isAsset)          event.respondWith(cacheFirst(req));
  else                       event.respondWith(cacheFirst(req));
});

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res && res.ok) cachePut(req, res.clone());
    return res;
  } catch {
    const cached = await caches.match(req);
    return cached || caches.match('./index.html');
  }
}

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res && res.ok) cachePut(req, res.clone());
    return res;
  } catch {
    return cached;
  }
}

function cachePut(req, res) {
  caches.open(CACHE_NAME).then(c => c.put(req, res)).catch(() => {});
}

/* ── Push (server-sent, future use) ──────────────────────── */
self.addEventListener('push', event => {
  let data = { title: 'GeriBand', body: 'Ada peringatan baru.' };
  try { data = event.data.json(); } catch { data.body = event.data?.text() || data.body; }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:               data.body,
      icon:               './assets/icon-192.png',
      badge:              './assets/badge-72.png',
      tag:                'geriband-push',
      renotify:           true,
      requireInteraction: data.requireInteraction || false,
      vibrate:            [300, 100, 300],
      data:               data,
    })
  );
});

/* ── Notification Click ──────────────────────────────────── */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      const url = './dashboard.html#dashboard';
      for (const client of clientList) {
        if ((client.url.includes('dashboard.html') || client.url.includes('auth.html')) && 'focus' in client) {
          client.focus();
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
