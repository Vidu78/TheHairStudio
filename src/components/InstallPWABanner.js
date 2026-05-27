import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';

// Memoria solo in-memory (resetta a ogni reload, niente localStorage)
const dismissed = { android: false, ios: false, update: false };

export default function InstallPWABanner() {
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIOS, setShowIOS]         = useState(false);
  const [showUpdate, setShowUpdate]   = useState(false);
  const deferredPrompt = useRef(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof window === 'undefined') return;

    // Android / Chrome desktop: intercetta il prompt nativo
    const handleInstall = (e) => {
      e.preventDefault();
      deferredPrompt.current = e;
      if (!dismissed.android) setShowAndroid(true);
    };
    window.addEventListener('beforeinstallprompt', handleInstall);

    // iOS Safari: no prompt nativo, mostriamo istruzioni manuali
    const ua          = (navigator.userAgent || '').toLowerCase();
    const isIOS       = /iphone|ipad|ipod/.test(ua);
    const isStandalone = window.navigator.standalone === true
                      || window.matchMedia?.('(display-mode: standalone)').matches;
    if (isIOS && !isStandalone && !dismissed.ios) {
      // Ritardo per non comparire subito al primo paint
      const t = setTimeout(() => setShowIOS(true), 2500);
      // cleanup separato
      return () => {
        clearTimeout(t);
        window.removeEventListener('beforeinstallprompt', handleInstall);
      };
    }

    // App installata con successo → nascondi banner
    const handleInstalled = () => {
      dismissed.android = true;
      dismissed.ios     = true;
      setShowAndroid(false);
      setShowIOS(false);
    };
    window.addEventListener('appinstalled', handleInstalled);

    // Aggiornamento disponibile (dispatched da index.html)
    const handleUpdate = () => {
      if (!dismissed.update) setShowUpdate(true);
    };
    window.addEventListener('pwa-update-available', handleUpdate);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstall);
      window.removeEventListener('appinstalled', handleInstalled);
      window.removeEventListener('pwa-update-available', handleUpdate);
    };
  }, []);

  const installAndroid = async () => {
    const ev = deferredPrompt.current;
    if (!ev) { setShowAndroid(false); return; }
    try {
      ev.prompt();
      await ev.userChoice;
    } catch (_) {}
    deferredPrompt.current = null;
    dismissed.android = true;
    setShowAndroid(false);
  };

  const applyUpdate = () => {
    // Forza il nuovo SW a prendere il controllo: il listener
    // controllerchange (in index.html) farà reload automatico.
    const w = (typeof window !== 'undefined') ? window.__PWA_NEW_WORKER__ : null;
    if (w) {
      try { w.postMessage({ type: 'SKIP_WAITING' }); } catch (_) {}
    } else if (navigator.serviceWorker?.controller) {
      try { navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' }); } catch (_) {}
    }
    dismissed.update = true;
    setShowUpdate(false);
  };

  const closeAndroid = () => { dismissed.android = true; setShowAndroid(false); };
  const closeIOS     = () => { dismissed.ios     = true; setShowIOS(false); };
  const closeUpdate  = () => { dismissed.update  = true; setShowUpdate(false); };

  if (Platform.OS !== 'web') return null;

  return (
    <>
      {showUpdate && (
        <View style={[styles.banner, styles.updateBanner]} pointerEvents="box-none">
          <Text style={styles.icon}>🔄</Text>
          <Text style={styles.text}>Nuova versione disponibile</Text>
          <TouchableOpacity onPress={applyUpdate} style={styles.btnPrimary}>
            <Text style={styles.btnPrimaryText}>Aggiorna</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={closeUpdate} style={styles.close}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {showAndroid && (
        <View style={styles.banner} pointerEvents="box-none">
          <Text style={styles.icon}>📲</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.text}>Installa l'app sul tuo telefono</Text>
            <Text style={styles.subtext}>Accesso rapido + funziona offline</Text>
          </View>
          <TouchableOpacity onPress={installAndroid} style={styles.btnPrimary}>
            <Text style={styles.btnPrimaryText}>Installa</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={closeAndroid} style={styles.close}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {showIOS && (
        <View style={styles.banner} pointerEvents="box-none">
          <Text style={styles.icon}>📲</Text>
          <Text style={styles.text}>
            Tocca <Text style={styles.bold}>Condividi ⬆</Text> poi <Text style={styles.bold}>Aggiungi a Home</Text>
          </Text>
          <TouchableOpacity onPress={closeIOS} style={styles.close}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'fixed',
    bottom: 16, left: 16, right: 16,
    backgroundColor: '#141414',
    borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 14,
    flexDirection: 'row', alignItems: 'center',
    gap: 10,
    zIndex: 9999,
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.45)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
    maxWidth: 520, marginHorizontal: 'auto',
  },
  updateBanner: {
    backgroundColor: '#0B2A1A',
    borderColor: 'rgba(46,204,113,0.55)',
  },
  icon: { fontSize: 22 },
  text: { color: '#fff', flex: 1, fontSize: 14, fontWeight: '600' },
  subtext: { color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 2 },
  bold: { fontWeight: '900', color: '#C9A84C' },
  btnPrimary: {
    backgroundColor: '#C9A84C', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  btnPrimaryText: { color: '#000', fontWeight: '900', fontSize: 13 },
  close: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  closeText: { color: 'rgba(255,255,255,0.55)', fontSize: 16 },
});
