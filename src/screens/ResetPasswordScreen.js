import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, Platform, KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../config/supabase';

export default function ResetPasswordScreen({ navigation }) {
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);
  const [showPass, setShowPass]   = useState(false);

  useEffect(() => {
    // Pulisce l'hash URL per evitare ri-trigger del flusso recovery al reload
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const showAlert = (title, msg) => {
    if (Platform.OS === 'web') window.alert(`${title}\n\n${msg}`);
    else Alert.alert(title, msg);
  };

  const handleReset = async () => {
    if (!password || password.length < 6) {
      showAlert('Attenzione', 'La password deve essere di almeno 6 caratteri.');
      return;
    }
    if (password !== confirm) {
      showAlert('Attenzione', 'Le due password non coincidono.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
    } catch (e) {
      showAlert('Errore', e.message || 'Impossibile aggiornare la password. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <LinearGradient colors={['#0A0A0A', '#141414']} style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>Password aggiornata!</Text>
          <Text style={styles.successText}>Puoi ora accedere con la tua nuova password.</Text>
          <TouchableOpacity style={styles.btn} onPress={() => navigation.replace('Login')}>
            <Text style={styles.btnText}>Vai al Login →</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0A0A0A', '#141414', '#0D1B2A']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.logoWrap}>
            <Text style={styles.logoIcon}>✂</Text>
          </View>
          <Text style={styles.title}>Reimposta Password</Text>
          <Text style={styles.subtitle}>Scegli una nuova password sicura per il tuo account.</Text>

          <View style={styles.card}>
            <Text style={styles.label}>NUOVA PASSWORD</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Minimo 6 caratteri"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                autoCapitalize="none"
                autoFocus
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                <Text style={{ fontSize: 18, color: 'rgba(255,255,255,0.4)' }}>{showPass ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { marginTop: 20 }]}>CONFERMA PASSWORD</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Ripeti la password"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry={!showPass}
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && { opacity: 0.6 }]}
              onPress={handleReset}
              disabled={loading}
            >
              <Text style={styles.btnText}>{loading ? 'Salvataggio...' : '🔑 Salva nuova password'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.replace('Login')}>
            <Text style={styles.backBtnText}>← Torna al Login</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  logoWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderWidth: 2, borderColor: '#C9A84C',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 20,
  },
  logoIcon: { fontSize: 34, color: '#C9A84C' },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20,
    padding: 24, borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)',
  },
  label: { color: '#C9A84C', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)',
    paddingHorizontal: 14, height: 52,
  },
  input: { color: '#FFFFFF', fontSize: 16 },
  btn: {
    marginTop: 28, backgroundColor: '#C9A84C', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  btnText: { color: '#000000', fontWeight: '800', fontSize: 16 },
  backBtn: { marginTop: 20, alignItems: 'center', paddingVertical: 10 },
  backBtnText: { color: 'rgba(201,168,76,0.7)', fontSize: 13, fontWeight: '600' },
  successIcon: { fontSize: 72, marginBottom: 24 },
  successTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', marginBottom: 12, textAlign: 'center' },
  successText: { color: 'rgba(255,255,255,0.6)', fontSize: 15, textAlign: 'center', marginBottom: 36, lineHeight: 22 },
});
