import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Animated, Alert, ScrollView,
  Dimensions, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useApp } from '../context/AppContext';
import { supabase } from '../config/supabase';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const { loginAdmin, loginUser, incrementPageViews } = useApp();
  const [mode, setMode] = useState('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [rememberEmail, setRememberEmail] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const tabAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    incrementPageViews();
    if (Platform.OS === 'web') {
      const saved = localStorage.getItem('ths_remembered_email');
      if (saved) { setEmail(saved); setRememberMe(true); }
    }
    if (Platform.OS !== 'web') {
      LocalAuthentication.hasHardwareAsync().then(has => {
        if (has) LocalAuthentication.isEnrolledAsync().then(setBiometricAvailable);
      });
    }
  }, []);

  const switchMode = (newMode) => {
    setMode(newMode);
    setEmail('');
    setPassword('');
    Animated.spring(tabAnim, {
      toValue: newMode === 'user' ? 0 : 1,
      useNativeDriver: false,
    }).start();
  };

  const withTimeout = (promise, ms = 12000) =>
    Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showAlert('Attenzione', 'Inserisci email e password');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'admin') {
        const ok = await withTimeout(loginAdmin(email, password));
        if (ok) {
          navigation.replace('AdminTabs');
        } else {
          showAlert('Errore', 'Credenziali amministratore non corrette');
        }
      } else {
        const ok = await withTimeout(loginUser(email, password));
        if (ok === true) {
          if (Platform.OS === 'web') {
            rememberMe
              ? localStorage.setItem('ths_remembered_email', email.trim())
              : localStorage.removeItem('ths_remembered_email');
          }
          // Biometria: se disponibile e non ancora attivata, propone attivazione
          if (biometricAvailable && Platform.OS !== 'web') {
            const alreadyEnabled = global.__biometricEnabled;
            if (!alreadyEnabled) {
              Alert.alert(
                'Accesso biometrico',
                'Vuoi attivare l\'accesso con impronta digitale per i prossimi accessi?',
                [
                  { text: 'Non ora', style: 'cancel', onPress: () => navigation.replace('MainTabs') },
                  {
                    text: 'Attiva', onPress: () => {
                      global.__biometricEnabled = true;
                      global.__biometricEmail = email.trim();
                      navigation.replace('MainTabs');
                    }
                  },
                ]
              );
              return;
            }
          }
          navigation.replace('MainTabs');
        } else if (ok === 'unconfirmed') {
          showAlert('📧 Email non confermata', 'Clicca il link che ti abbiamo inviato per attivare l\'account, poi riprova ad accedere.');
        } else {
          showAlert('Errore accesso', 'Email o password non corretti.\nSe non ricordi la password, usa "Recupera password".');
        }
      }
    } catch (e) {
      if (e?.message === 'timeout') {
        showAlert('Connessione lenta', 'Il server non risponde. Controlla la connessione e riprova.');
      } else {
        showAlert('Errore', 'Si è verificato un errore. Riprova.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      showAlert('Attenzione', 'Inserisci prima la tua email nel campo sopra.');
      return;
    }
    try {
      await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: 'https://the-hair-studio.vercel.app',
      });
      showAlert('✉️ Email inviata', `Abbiamo inviato un link per reimpostare la password a ${email.trim()}`);
    } catch (_) {
      showAlert('Errore', 'Impossibile inviare l\'email. Riprova.');
    }
  };

  const handleBiometric = async () => {
    const savedEmail = global.__biometricEmail || email.trim();
    if (!savedEmail) {
      Alert.alert('Impronta digitale', 'Inserisci prima la tua email.');
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Accedi con impronta digitale',
      fallbackLabel: 'Usa password',
      cancelLabel: 'Annulla',
    });
    if (result.success) {
      setLoading(true);
      const ok = await loginUser(savedEmail, password.trim() || '__biometric__');
      setLoading(false);
      if (ok === true) {
        navigation.replace('MainTabs');
      } else {
        Alert.alert('Accesso biometrico', 'Impronta verificata. Inserisci anche la password per completare.');
      }
    }
  };

  const showAlert = (title, msg) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  };

  const tabIndicatorLeft = tabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['2%', '50%'],
  });

  return (
    <LinearGradient colors={['#0A0A0A', '#141414', '#0D1B2A']} style={styles.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.header}>
            <View style={styles.logoMini}>
              <Text style={styles.logoIcon}>✂</Text>
            </View>
            <Text style={styles.title}>THE HAIR STUDIO</Text>
            <Text style={styles.subtitle}>Noci • Puglia</Text>
          </View>

          <View style={styles.tabContainer}>
            <Animated.View style={[styles.tabIndicator, { left: tabIndicatorLeft }]} />
            <TouchableOpacity style={styles.tab} onPress={() => switchMode('user')}>
              <View style={styles.tabInner}>
                <Ionicons name="person-outline" size={15} color={mode === 'user' ? '#000' : 'rgba(255,255,255,0.5)'} />
                <Text style={[styles.tabText, mode === 'user' && styles.tabTextActive]}> Cliente</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tab} onPress={() => switchMode('admin')}>
              <View style={styles.tabInner}>
                <Ionicons name="lock-closed-outline" size={15} color={mode === 'admin' ? '#000' : 'rgba(255,255,255,0.5)'} />
                <Text style={[styles.tabText, mode === 'admin' && styles.tabTextActive]}> Admin</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>
              {mode === 'admin' ? 'Area Amministratore' : 'Bentornato!'}
            </Text>
            <Text style={styles.formSubtitle}>
              {mode === 'admin' ? 'Accesso riservato al personale' : 'Accedi al tuo account'}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>EMAIL</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={18} color="#C9A84C" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="La tua email"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>PASSWORD</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color="#C9A84C" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                  autoComplete="current-password"
                  textContentType="password"
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                  <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
              </View>
            </View>

            {mode === 'user' && (
              <TouchableOpacity style={styles.rememberRow} onPress={() => setRememberMe(!rememberMe)}>
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Ionicons name="checkmark" size={12} color="#000" />}
                </View>
                <Text style={styles.rememberText}>Ricorda email</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              <LinearGradient
                colors={['#C9A84C', '#A87C30']}
                style={styles.loginGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {loading
                    ? <Ionicons name="hourglass-outline" size={18} color="#000" />
                    : <Ionicons name={mode === 'admin' ? 'shield-checkmark-outline' : 'log-in-outline'} size={18} color="#000" />
                  }
                  <Text style={styles.loginButtonText}>
                    {loading ? 'Accesso...' : mode === 'admin' ? 'Accedi come Admin' : 'Entra'}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {biometricAvailable && mode === 'user' && (
              <TouchableOpacity style={styles.biometricBtn} onPress={handleBiometric}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="finger-print-outline" size={20} color="#C9A84C" />
                  <Text style={styles.biometricText}>Accedi con impronta digitale</Text>
                </View>
              </TouchableOpacity>
            )}

            {mode === 'user' && (
              <TouchableOpacity style={styles.forgotBtn} onPress={handleForgotPassword}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="key-outline" size={14} color="rgba(201,168,76,0.7)" />
                  <Text style={styles.forgotText}>Recupera password</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {mode === 'user' && (
            <TouchableOpacity
              style={styles.registerLink}
              onPress={() => navigation.replace('Register')}
            >
              <Text style={styles.registerLinkText}>
                Non hai un account?{' '}
                <Text style={styles.registerLinkBold}>Registrati</Text>
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.footer}>
            <View style={styles.footerRow}>
              <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.35)" />
              <Text style={styles.footerText}> Via Alessandro Manzoni, 38 • Noci (BA)</Text>
            </View>
            <View style={styles.footerRow}>
              <Ionicons name="call-outline" size={11} color="rgba(255,255,255,0.35)" />
              <Text style={styles.footerText}> +39 328 594 4459</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 30 },
  header: { alignItems: 'center', marginBottom: 36 },
  logoMini: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderWidth: 2, borderColor: '#C9A84C',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    shadowColor: '#C9A84C', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 15, elevation: 8,
  },
  logoIcon: { fontSize: 32, color: '#C9A84C' },
  title: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', letterSpacing: 6 },
  subtitle: { fontSize: 12, color: '#C9A84C', letterSpacing: 3, marginTop: 4 },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14, padding: 4, marginBottom: 28, position: 'relative',
  },
  tabIndicator: {
    position: 'absolute', top: 4, bottom: 4,
    width: '48%', backgroundColor: '#C9A84C', borderRadius: 10,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabInner: { flexDirection: 'row', alignItems: 'center' },
  tabText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  tabTextActive: { color: '#000000' },
  formContainer: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)',
  },
  formTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  formSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 24 },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 12, color: '#C9A84C', fontWeight: '600', marginBottom: 8, letterSpacing: 1 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)',
    paddingHorizontal: 14, height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#FFFFFF', fontSize: 16 },
  showPass: { fontSize: 20, paddingLeft: 8 },
  loginButton: { marginTop: 8, borderRadius: 14, overflow: 'hidden' },
  loginButtonDisabled: { opacity: 0.6 },
  loginGradient: { paddingVertical: 16, alignItems: 'center' },
  loginButtonText: { color: '#000000', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  biometricBtn: {
    marginTop: 14, paddingVertical: 12, alignItems: 'center',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)',
    backgroundColor: 'rgba(201,168,76,0.05)',
  },
  biometricText: { color: '#C9A84C', fontWeight: '700', fontSize: 14 },
  footer: { alignItems: 'center', marginTop: 32, gap: 6 },
  footerRow: { flexDirection: 'row', alignItems: 'center' },
  footerText: { color: 'rgba(255,255,255,0.35)', fontSize: 11 },
  registerLink: { alignItems: 'center', marginTop: 20 },
  registerLinkText: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  registerLinkBold: { color: '#C9A84C', fontWeight: '700' },
  forgotBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 8 },
  forgotText: { color: 'rgba(201,168,76,0.7)', fontSize: 13, fontWeight: '600' },
  rememberRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, marginTop: 4, gap: 10 },
  checkbox: {
    width: 20, height: 20, borderRadius: 5,
    borderWidth: 1.5, borderColor: '#C9A84C',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#C9A84C' },
  rememberText: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
});
