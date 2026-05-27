import { registerRootComponent } from 'expo';
import 'react-native-gesture-handler';
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';

// Top-level ErrorBoundary indipendente: cattura errori di render di App.
class TopErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) {
    try { console.error('[TopErrorBoundary]', error, info?.componentStack); } catch (_) {}
    try {
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new ErrorEvent('error', {
          message: 'React render error: ' + (error?.message || error),
          error,
        }));
      }
    } catch (_) {}
  }
  render() {
    if (this.state.error) {
      const msg = String(this.state.error?.message || this.state.error);
      const stack = String(this.state.error?.stack || '').split('\n').slice(0, 10).join('\n');
      return (
        <View style={{ flex: 1, backgroundColor: '#0A0A0A', minHeight: '100vh' }}>
          <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
            <Text style={{ color: '#C9A84C', fontSize: 22, fontWeight: '900', marginBottom: 8 }}>
              ⚠️ App crashed
            </Text>
            <Text style={{ color: '#fff', fontSize: 13, marginBottom: 12, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }}>
              {msg}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, lineHeight: 16, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }}>
              {stack}
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (Platform.OS === 'web' && typeof window !== 'undefined') {
                  try {
                    if ('caches' in window) caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k))));
                    if (navigator.serviceWorker) navigator.serviceWorker.getRegistrations().then(rs => Promise.all(rs.map(r => r.unregister())));
                  } catch (_) {}
                  setTimeout(() => window.location.reload(), 300);
                }
              }}
              style={{ marginTop: 24, backgroundColor: '#C9A84C', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
            >
              <Text style={{ color: '#000', fontWeight: '900', fontSize: 15 }}>🔄 Ricarica pulito</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

let App;
try {
  App = require('./App').default;
} catch (importErr) {
  try { console.error('[index.js] App import failed:', importErr); } catch (_) {}
  App = function FallbackApp() {
    const msg = String(importErr?.message || importErr);
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0A', padding: 24, paddingTop: 60 }}>
        <Text style={{ color: '#e74c3c', fontSize: 22, fontWeight: '900', marginBottom: 12 }}>
          ⚠️ Errore caricamento App
        </Text>
        <Text style={{ color: '#fff', fontSize: 13 }}>{msg}</Text>
      </View>
    );
  };
}

function Root() {
  return (
    <TopErrorBoundary>
      <App />
    </TopErrorBoundary>
  );
}

registerRootComponent(Root);
