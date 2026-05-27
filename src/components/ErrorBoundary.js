import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    try { console.error('[ErrorBoundary]', error, info?.componentStack); } catch (_) {}
  }

  handleReload = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Pulisce caches + deregistra SW + reload — recovery completo
      try {
        if ('caches' in window) {
          caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k))));
        }
        if (navigator.serviceWorker) {
          navigator.serviceWorker.getRegistrations().then(rs => Promise.all(rs.map(r => r.unregister())));
        }
      } catch (_) {}
      try { window.location.reload(); } catch (_) {}
    }
  };

  render() {
    if (!this.state.error) return this.props.children;
    const errMsg = String(this.state.error?.message || this.state.error || 'Errore sconosciuto');
    const stack  = String(this.state.error?.stack || '');
    const compStack = String(this.state.info?.componentStack || '');

    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0A', minHeight: '100vh' }}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
          <Text style={{ color: '#C9A84C', fontSize: 22, fontWeight: '900', marginBottom: 8 }}>
            ⚠️ Errore App
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, marginBottom: 20 }}>
            Si è verificato un errore. Tocca "Ricarica" per ripartire pulito.
          </Text>

          <View style={{
            backgroundColor: 'rgba(231,76,60,0.1)',
            borderColor: 'rgba(231,76,60,0.4)',
            borderWidth: 1, borderRadius: 12,
            padding: 14, marginBottom: 20,
          }}>
            <Text style={{ color: '#e74c3c', fontWeight: '800', fontSize: 13, marginBottom: 6 }}>
              Dettagli errore
            </Text>
            <Text style={{ color: '#fff', fontSize: 13, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }}>
              {errMsg}
            </Text>
          </View>

          {stack ? (
            <View style={{ marginBottom: 20 }}>
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '700', marginBottom: 6 }}>
                Stack trace
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, lineHeight: 16, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }}>
                {stack.split('\n').slice(0, 8).join('\n')}
              </Text>
            </View>
          ) : null}

          {compStack ? (
            <View style={{ marginBottom: 20 }}>
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '700', marginBottom: 6 }}>
                Component stack
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, lineHeight: 16, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }}>
                {compStack.split('\n').slice(0, 8).join('\n')}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={this.handleReload}
            style={{
              backgroundColor: '#C9A84C', borderRadius: 12,
              paddingVertical: 14, alignItems: 'center', marginTop: 10,
            }}
          >
            <Text style={{ color: '#000', fontWeight: '900', fontSize: 15 }}>
              🔄 Ricarica App (cancella cache)
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }
}
