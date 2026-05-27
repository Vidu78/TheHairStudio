// The Hair Studio — Service Worker MINIMAL (no-cache passthrough)
// Strategia: il SW esiste SOLO per rendere la PWA installabile. Non intercetta
// fetch, non cacha nulla. Tutto va dritto alla rete. Niente bug di stale
// content, niente schermate nere da bundle obsoleto.
const CACHE_VERSION = '__CACHE_VERSION__';

self.addEventListener('install', (event) => {
  // skipWaiting nell'install: il nuovo SW deve prendere subito il controllo
  // perche' il vecchio SW workbox era la causa del problema.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Cancella TUTTE le cache esistenti (workbox + qualsiasi residuo)
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// NIENTE fetch handler. Tutti i fetch passano direttamente al browser → rete.
// PWA resta installabile (manifest + SW registrato e' sufficiente).
// Niente offline, ma garantisce zero contenuto stale.
