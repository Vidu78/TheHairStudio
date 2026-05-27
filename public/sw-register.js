// Service Worker registration + auto-recovery + banner update
// Caricato come <script src="/sw-register.js" defer>: gira anche se il
// bundle React fallisce a caricare (recovery da PWA bacata).
(function () {
  'use strict';

  if (!('serviceWorker' in navigator)) return;

  var WORKBOX_CACHE_PATTERNS = [
    /^workbox-/,
    /^pages-/,
    /^expo-bundle-/,
    /^img-v/,
    /^fonts-v/,
    /^api-cache/,
    /^pwa-cache-/, // anche le nostre vecchie versioni
  ];

  var refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  // Step 1: pulizia automatica delle cache di SW precedenti che potrebbero
  // servire HTML+bundle stale. Usa window.name come marker per non fare loop
  // di reload (window.name persiste tra reload nella stessa tab).
  function autoRecover() {
    return Promise.all([
      ('caches' in window) ? caches.keys().catch(function () { return []; }) : Promise.resolve([]),
      navigator.serviceWorker.getRegistrations().catch(function () { return []; }),
    ]).then(function (results) {
      var cacheKeys = results[0];
      var regs      = results[1];

      var hasOldCaches = cacheKeys.some(function (k) {
        return WORKBOX_CACHE_PATTERNS.some(function (re) { return re.test(k); });
      });

      // Heuristica: se c'e' cache vecchia E non abbiamo gia' pulito → recovery
      if (hasOldCaches && window.name !== 'ths_cleared_v2') {
        console.log('[PWA] Recovery: trovate cache vecchie, pulisco e ricarico');
        return Promise.all([
          Promise.all(cacheKeys.map(function (k) { return caches.delete(k); })),
          Promise.all(regs.map(function (r) { return r.unregister(); })),
        ]).then(function () {
          window.name = 'ths_cleared_v2';
          // Reload forzato senza cache HTTP (cache-busting query)
          var url = window.location.href.split('?')[0].split('#')[0];
          var sep = url.indexOf('?') >= 0 ? '&' : '?';
          window.location.replace(url + sep + '_t=' + Date.now());
          return null; // bloccha la registrazione SW
        }).catch(function (err) {
          console.warn('[PWA] Recovery fallito:', err);
          return false;
        });
      }
      return true; // OK procedi con la registrazione
    });
  }

  function registerSW() {
    navigator.serviceWorker.register('/sw.js').then(function (registration) {
      // SW gia' in waiting all'avvio (utente aveva chiuso senza accettare update)
      if (registration.waiting && navigator.serviceWorker.controller) {
        showUpdateBanner(registration);
      }

      registration.addEventListener('updatefound', function () {
        var newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', function () {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBanner(registration);
          }
        });
      });

      // Forza update-check (Vercel serve sw.js no-cache)
      try { registration.update(); } catch (_) {}
    }).catch(function (err) {
      console.warn('[PWA] SW register failed:', err);
    });

    // Recovery banner: se React non monta dopo 12s, offri reset totale
    setTimeout(function () {
      var root = document.getElementById('root');
      var boot = document.getElementById('pwa-boot');
      if (boot && boot.parentNode && boot.offsetParent !== null) {
        showRecoveryBanner();
      }
      // Se #root e' vuoto dopo 12s, idem
      if (root && root.children.length === 0) {
        showRecoveryBanner();
      }
    }, 12000);
  }

  function showUpdateBanner(registration) {
    if (document.getElementById('pwa-update-banner')) return;

    var banner = document.createElement('div');
    banner.id = 'pwa-update-banner';
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');
    banner.style.cssText = [
      'position:fixed','bottom:1.5rem','left:50%','transform:translateX(-50%)',
      'background:#01696f','color:#ffffff','border-radius:9999px',
      'padding:10px 14px 10px 18px','display:flex','align-items:center','gap:12px',
      'box-shadow:0 10px 30px rgba(0,0,0,0.35)',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
      'font-size:14px','font-weight:600','z-index:9999',
      'max-width:calc(100vw - 32px)',
    ].join(';');

    var text = document.createElement('span');
    text.textContent = 'Nuova versione disponibile!';
    text.style.cssText = 'flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';

    var updateBtn = document.createElement('button');
    updateBtn.type = 'button';
    updateBtn.textContent = 'Aggiorna ora';
    updateBtn.style.cssText = 'background:#ffffff;color:#01696f;border:none;border-radius:9999px;padding:8px 14px;font-weight:800;font-size:13px;cursor:pointer;';
    updateBtn.addEventListener('click', function () {
      var waiting = registration.waiting;
      if (waiting) {
        try { waiting.postMessage({ type: 'SKIP_WAITING' }); } catch (_) {}
      }
      banner.remove();
    });

    var dismissBtn = document.createElement('button');
    dismissBtn.type = 'button';
    dismissBtn.setAttribute('aria-label', 'Chiudi');
    dismissBtn.textContent = '✕';
    dismissBtn.style.cssText = 'background:transparent;color:#ffffff;border:none;font-size:16px;cursor:pointer;opacity:0.7;padding:0 4px;';
    dismissBtn.addEventListener('click', function () { banner.remove(); });

    banner.appendChild(text);
    banner.appendChild(updateBtn);
    banner.appendChild(dismissBtn);
    document.body.appendChild(banner);
  }

  function showRecoveryBanner() {
    if (document.getElementById('pwa-recovery-banner')) return;

    var banner = document.createElement('div');
    banner.id = 'pwa-recovery-banner';
    banner.style.cssText = [
      'position:fixed','inset:0','background:#0A0A0A','color:#ffffff',
      'display:flex','flex-direction:column','align-items:center','justify-content:center',
      'gap:18px','padding:24px','text-align:center',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
      'z-index:99999',
    ].join(';');

    banner.innerHTML =
      '<div style="font-size:56px">&#9986;&#65039;</div>' +
      '<h2 style="margin:0;font-size:20px;color:#C9A84C">L\'app non si è avviata</h2>' +
      '<p style="margin:0;opacity:.65;font-size:14px;line-height:1.5;max-width:340px">' +
      'Tocca "Reset completo" per cancellare tutto e ripartire pulito.</p>';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '🔄 Reset completo';
    btn.style.cssText = 'background:#C9A84C;color:#000000;border:none;border-radius:9999px;padding:14px 28px;font-weight:900;font-size:15px;cursor:pointer;margin-top:8px;';
    btn.addEventListener('click', function () {
      Promise.all([
        ('caches' in window) ? caches.keys().then(function (ks) {
          return Promise.all(ks.map(function (k) { return caches.delete(k); }));
        }) : Promise.resolve(),
        navigator.serviceWorker.getRegistrations().then(function (regs) {
          return Promise.all(regs.map(function (r) { return r.unregister(); }));
        }),
      ]).then(function () {
        window.name = '';
        var url = window.location.origin + '/?_t=' + Date.now();
        window.location.replace(url);
      }).catch(function () { window.location.reload(); });
    });

    banner.appendChild(btn);
    document.body.appendChild(banner);
  }

  // Avvio
  function start() {
    autoRecover().then(function (proceed) {
      if (proceed === true) registerSW();
      // se proceed === null o false, recovery ha gia' fatto reload o ha fallito
    }).catch(function (err) {
      console.warn('[PWA] autoRecover errore:', err);
      registerSW(); // tentiamo comunque
    });
  }

  if (document.readyState === 'complete') {
    start();
  } else {
    window.addEventListener('load', start);
  }

  window.registerSW = registerSW;
})();
