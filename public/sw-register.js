// Service Worker registration + banner di aggiornamento vanilla.
// Caricato come <script src="/sw-register.js" defer></script>: gira anche
// se il bundle React fallisce a caricare (recovery da PWA bacata).
(function () {
  'use strict';

  if (!('serviceWorker' in navigator)) return;

  var refreshing = false;
  // Quando il nuovo SW prende il controllo, ricarichiamo UNA volta sola
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  function registerSW() {
    navigator.serviceWorker.register('/sw.js').then(function (registration) {
      // Caso A: c'è già un SW in "waiting" al momento del load (l'utente
      // aveva chiuso la tab senza accettare l'update precedente)
      if (registration.waiting && navigator.serviceWorker.controller) {
        showUpdateBanner(registration);
      }

      // Caso B: un nuovo SW viene scoperto durante questa sessione
      registration.addEventListener('updatefound', function () {
        var newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', function () {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // C'è una nuova versione installata + un controller attivo
            // (=non è la primissima install) → banner update
            showUpdateBanner(registration);
          }
        });
      });

      // Forza un update-check ad ogni page load (Vercel serve sw.js con no-cache)
      try { registration.update(); } catch (_) {}
    }).catch(function (err) {
      console.warn('[PWA] SW register failed:', err);
    });

    // Fallback recovery: se React non monta dopo 12s, mostra un banner
    // di emergenza che invita l'utente ad aggiornare manualmente.
    setTimeout(function () {
      var root = document.getElementById('root');
      var boot = document.getElementById('pwa-boot');
      // Se #pwa-boot è ancora visibile → React non ha mai montato
      if (boot && boot.parentNode && boot.offsetParent !== null) {
        showRecoveryBanner();
      }
    }, 12000);
  }

  function showUpdateBanner(registration) {
    if (document.getElementById('pwa-update-banner')) return; // già visibile

    var banner = document.createElement('div');
    banner.id = 'pwa-update-banner';
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');
    banner.style.cssText = [
      'position:fixed',
      'bottom:1.5rem',
      'left:50%',
      'transform:translateX(-50%)',
      'background:#01696f',
      'color:#ffffff',
      'border-radius:9999px',
      'padding:10px 14px 10px 18px',
      'display:flex',
      'align-items:center',
      'gap:12px',
      'box-shadow:0 10px 30px rgba(0,0,0,0.35)',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
      'font-size:14px',
      'font-weight:600',
      'z-index:9999',
      'max-width:calc(100vw - 32px)',
    ].join(';');

    var text = document.createElement('span');
    text.textContent = 'Nuova versione disponibile!';
    text.style.cssText = 'flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';

    var updateBtn = document.createElement('button');
    updateBtn.type = 'button';
    updateBtn.textContent = 'Aggiorna ora';
    updateBtn.style.cssText = [
      'background:#ffffff',
      'color:#01696f',
      'border:none',
      'border-radius:9999px',
      'padding:8px 14px',
      'font-weight:800',
      'font-size:13px',
      'cursor:pointer',
    ].join(';');
    updateBtn.addEventListener('click', function () {
      var waiting = registration.waiting;
      if (waiting) {
        try { waiting.postMessage({ type: 'SKIP_WAITING' }); } catch (_) {}
      } else if (navigator.serviceWorker.controller) {
        try { navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' }); } catch (_) {}
      }
      banner.remove();
      // controllerchange listener farà reload automatico
    });

    var dismissBtn = document.createElement('button');
    dismissBtn.type = 'button';
    dismissBtn.setAttribute('aria-label', 'Chiudi');
    dismissBtn.textContent = '✕';
    dismissBtn.style.cssText = [
      'background:transparent',
      'color:#ffffff',
      'border:none',
      'font-size:16px',
      'cursor:pointer',
      'opacity:0.7',
      'padding:0 4px',
    ].join(';');
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
      'position:fixed',
      'inset:0',
      'background:#0A0A0A',
      'color:#ffffff',
      'display:flex',
      'flex-direction:column',
      'align-items:center',
      'justify-content:center',
      'gap:18px',
      'padding:24px',
      'text-align:center',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
      'z-index:99999',
    ].join(';');

    banner.innerHTML =
      '<div style="font-size:56px">&#9986;&#65039;</div>' +
      '<h2 style="margin:0;font-size:20px;color:#C9A84C">L\'app non si è avviata</h2>' +
      '<p style="margin:0;opacity:.65;font-size:14px;line-height:1.5;max-width:320px">' +
      'Probabilmente è disponibile una nuova versione. Tocca "Ricarica" per aggiornarla.</p>';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Ricarica';
    btn.style.cssText = [
      'background:#C9A84C',
      'color:#000000',
      'border:none',
      'border-radius:9999px',
      'padding:14px 28px',
      'font-weight:900',
      'font-size:15px',
      'cursor:pointer',
      'margin-top:8px',
    ].join(';');
    btn.addEventListener('click', function () {
      // Cancella tutte le cache + de-registra SW e ricarica pulito
      Promise.all([
        ('caches' in window) ? caches.keys().then(function (ks) {
          return Promise.all(ks.map(function (k) { return caches.delete(k); }));
        }) : Promise.resolve(),
        navigator.serviceWorker.getRegistrations().then(function (regs) {
          return Promise.all(regs.map(function (r) { return r.unregister(); }));
        }),
      ]).then(function () {
        window.location.reload();
      }).catch(function () { window.location.reload(); });
    });

    banner.appendChild(btn);
    document.body.appendChild(banner);
  }

  if (document.readyState === 'complete') {
    registerSW();
  } else {
    window.addEventListener('load', registerSW);
  }

  // Esponi globalmente per debug
  window.registerSW = registerSW;
})();
