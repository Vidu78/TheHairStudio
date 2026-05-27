import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';

// Memoria solo in-memory (reset a ogni reload — niente localStorage)
const dismissed = { android: false, ios: false };

export default function InstallPWABanner() {
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIOS, setShowIOS]         = useState(false);
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

    // iOS Safari: no prompt nativo → istruzioni manuali
    const ua           = (navigator.userAgent || '').toLowerCase();
    const isIOS        = /iphone|ipad|ipod/.test(ua);
    const isStandalone = window.navigator.standalone === true
                      || window.matchMedia?.('(display-mode: standalone)').matches;
    let iosTimer;
    if (isIOS && !isStandalone && !dismissed.ios) {
      iosTimer = setTimeout(() => setShowIOS(true), 2500);
    }

    // App installata → nascondi banner
    const handleInstalled = () => {
      dismissed.android = true;
      dismissed.ios     = true;
      setShowAndroid(false);
      setShowIOS(false);
    };
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      if (iosTimer) clearTimeout(iosTimer);
      window.removeEventListener('beforeinstallprompt', handleInstall);
      window.removeEventListener('appinstalled', handleInstalled);
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

  const closeAndroid = () => { dismissed.android = true; setShowAndroid(false); };
  const closeIOS     = () => { dismissed.ios     = true; setShowIOS(false); };

  if (Platform.OS !== 'web') return null;

  return (
    <>
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
    zIndex: 9998,
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.45)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
    maxWidth: 520, marginHorizontal: 'auto',
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
