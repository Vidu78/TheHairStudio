// The Hair Studio — Service Worker PWA
// Strategia: NetworkFirst per HTML, StaleWhileRevalidate per i bundle Expo,
// CacheFirst per le immagini, sempre rete per le chiamate Supabase.
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

if (workbox) {
  workbox.setConfig({ debug: false });

  const { registerRoute }              = workbox.routing;
  const { NetworkFirst, StaleWhileRevalidate, CacheFirst, NetworkOnly } = workbox.strategies;
  const { CacheableResponsePlugin }    = workbox.cacheableResponse;
  const { ExpirationPlugin }           = workbox.expiration;

  // Versione cache (utile per invalidare manualmente in futuro)
  const VERSION = 'v1';

  // Attiva subito senza aspettare la chiusura delle tab
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

  // Permette al client (banner aggiornamento) di forzare l'attivazione
  // della nuova versione del SW.
  self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
  });

  // ─── 1. HTML (navigazioni): NetworkFirst, fallback alla cache offline ────
  registerRoute(
    ({ request }) => request.mode === 'navigate',
    new NetworkFirst({
      cacheName: `pages-${VERSION}`,
      networkTimeoutSeconds: 4,
      plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
    })
  );

  // ─── 2. Bundle Expo (JS/CSS hashati): StaleWhileRevalidate ───────────────
  registerRoute(
    ({ url }) => url.pathname.startsWith('/_expo/static/'),
    new StaleWhileRevalidate({
      cacheName: `expo-bundle-${VERSION}`,
      plugins: [
        new CacheableResponsePlugin({ statuses: [0, 200] }),
        new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 7 * 24 * 60 * 60 }),
      ],
    })
  );

  // ─── 3. Immagini: CacheFirst (le foto barbieri non cambiano spesso) ──────
  registerRoute(
    ({ request }) => request.destination === 'image',
    new CacheFirst({
      cacheName: `img-${VERSION}`,
      plugins: [
        new CacheableResponsePlugin({ statuses: [0, 200] }),
        new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }),
      ],
    })
  );

  // ─── 4. Supabase (REST + Auth): sempre dalla rete, niente cache ──────────
  // Niente caching qui per evitare di servire dati staleti su prenotazioni/login.
  registerRoute(
    ({ url }) => url.hostname.includes('supabase.co'),
    new NetworkOnly()
  );

  // ─── 5. EmailJS: sempre dalla rete ───────────────────────────────────────
  registerRoute(
    ({ url }) => url.hostname.includes('emailjs.com'),
    new NetworkOnly()
  );

  // ─── 6. Font Google: CacheFirst (lunga durata) ───────────────────────────
  registerRoute(
    ({ url }) => url.hostname.includes('fonts.gstatic.com') || url.hostname.includes('fonts.googleapis.com'),
    new CacheFirst({
      cacheName: `fonts-${VERSION}`,
      plugins: [
        new CacheableResponsePlugin({ statuses: [0, 200] }),
        new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 }),
      ],
    })
  );
} else {
  console.warn('[SW] Workbox non caricato — service worker passthrough');
}
