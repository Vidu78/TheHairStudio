// The Hair Studio — Service Worker (vanilla, no external libs)
// CACHE_VERSION viene sostituito dallo script post-build (scripts/postbuild-pwa.js)
// con il timestamp del deploy. Se la sostituzione non avviene, fallback su una
// stringa fissa: il SW va comunque, ma cache invalidation manuale richiesta.
const CACHE_VERSION = '__CACHE_VERSION__';
const CACHE_NAME    = `pwa-cache-${CACHE_VERSION}`;

// Asset essenziali della shell — precachati all'install.
// Volutamente NON includo i bundle JS hashati (Expo li nomina con hash diverso
// ad ogni build): verranno cachati on-demand via cache-first quando vengono
// richiesti la prima volta.
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
  '/logo512-maskable.png',
  '/sw-register.js',
];

// ─── INSTALL ───────────────────────────────────────────────────────────────
// Pre-cacha la shell. NON chiama skipWaiting(): il nuovo SW resta in stato
// "waiting" finché l'utente non accetta l'aggiornamento dal banner.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .catch((err) => console.warn('[SW] install precache fallito:', err))
  );
});

// ─── ACTIVATE ──────────────────────────────────────────────────────────────
// Cancella TUTTE le cache che non corrispondono alla versione corrente.
// IMPORTANTE: cancelliamo anche cache di SW precedenti (Workbox: pages-cache,
// expo-bundle-cache, img-v1, fonts-v1, api-cache) per recuperare client
// bloccati su HTML stale che puntava a un bundle ormai cancellato dal deploy.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((k) => (k !== CACHE_NAME) ? caches.delete(k) : Promise.resolve())
      );
      await self.clients.claim();
    })()
  );
});

// ─── MESSAGE ───────────────────────────────────────────────────────────────
// Il banner di aggiornamento postа 'SKIP_WAITING' → forziamo l'attivazione.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ─── FETCH ─────────────────────────────────────────────────────────────────
// Strategie per tipo di risorsa.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // POST/PUT/DELETE → bypass

  const url = new URL(req.url);

  // 1. /api/* → bypass totale (mai cachare API)
  if (url.pathname.startsWith('/api/')) return;

  // 2. Supabase / EmailJS / qualsiasi origin esterna non https://the-hair-studio.* → bypass
  if (url.origin !== self.location.origin) {
    if (url.hostname.includes('supabase.co') || url.hostname.includes('emailjs.com')) {
      return; // bypass
    }
    // Altri cross-origin (es. Google Fonts): lasciamo passare e cachiamo le immagini sotto
  }

  // 3. HTML / navigazioni → NETWORK-FIRST con fallback alla cache offline
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(networkFirst(req));
    return;
  }

  // 4. Bundle JS/CSS hashati Expo (/_expo/static/*) → CACHE-FIRST (immutable)
  if (url.pathname.startsWith('/_expo/static/')) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // 5. Immagini, font → STALE-WHILE-REVALIDATE
  if (req.destination === 'image' || req.destination === 'font') {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // 6. Default: cache-first per asset locali, network-only per il resto
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(req));
  }
});

// ─── HELPERS STRATEGIE ─────────────────────────────────────────────────────
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(request);
    // Cacha solo risposte valide (200) — evitiamo di salvare 404/redirect
    if (fresh && fresh.status === 200 && fresh.type === 'basic') {
      cache.put(request, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch (err) {
    const cached = await cache.match(request) || await cache.match('/index.html') || await cache.match('/');
    if (cached) return cached;
    // Ultima spiaggia: pagina di errore minimale offline
    return new Response(
      '<!doctype html><meta charset="utf-8"><title>Offline</title><body style="background:#0A0A0A;color:#C9A84C;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:20px"><div><h1>Sei offline</h1><p style="opacity:.6">Controlla la connessione e riprova.</p></div></body>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 200 }
    );
  }
}

async function cacheFirst(request) {
  const cache  = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.status === 200) {
      cache.put(request, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch (err) {
    return cached || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache  = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((res) => {
      if (res && res.status === 200) {
        cache.put(request, res.clone()).catch(() => {});
      }
      return res;
    })
    .catch(() => null);
  return cached || networkPromise || Response.error();
}
