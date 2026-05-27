import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Animated, Alert, ScrollView,
  Dimensions, StatusBar, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as LocalAuthentication from 'expo-local-authentication';
import { useApp } from '../context/AppContext';
import { supabase, IS_RECOVERY_FLOW, INITIAL_URL, INITIAL_AUTH_CODE } from '../config/supabase';
import { ADMIN_CREDENTIALS } from '../data/appData';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const { loginAdmin, loginUser, incrementPageViews } = useApp();
  const [mode, setMode] = useState('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [recoveryDetected, setRecoveryDetected] = useState(IS_RECOVERY_FLOW);
  const [exchanging, setExchanging] = useState(false);

  const { height: screenHeight } = useWindowDimensions();
  const isCompact = screenHeight < 720; // schermi piccoli (iPhone SE, alcuni Android) — compatta tutto

  const tabAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    try { incrementPageViews(); } catch (_) {}
    if (Platform.OS === 'web') {
      try {
        const saved = (typeof localStorage !== 'undefined') ? localStorage.getItem('ths_remembered_email') : null;
        if (saved) { setEmail(saved); setRememberMe(true); }
      } catch (_) {}
    }
    if (Platform.OS !== 'web') {
      try {
        LocalAuthentication.hasHardwareAsync().then(has => {
          if (has) LocalAuthentication.isEnrolledAsync().then(setBiometricAvailable).catch(() => {});
        }).catch(() => {});
      } catch (_) {}
    }
  }, []);

  // Se siamo arrivati qui ma c'era un flusso di recovery (es. il SplashScreen ha sbagliato a routare,
  // o l'auth state listener non ha catturato l'evento), tentiamo manualmente lo scambio del code PKCE.
  useEffect(() => {
    if (!recoveryDetected) return;
    let cancelled = false;
    (async () => {
      try {
        setExchanging(true);
        // Tenta lo scambio manuale del code PKCE (se presente)
        if (INITIAL_AUTH_CODE) {
          try {
            await supabase.auth.exchangeCodeForSession(INITIAL_AUTH_CODE);
          } catch (e) {
            console.warn('[Login] exchangeCodeForSession fallito:', e?.message);
          }
        }
        // Verifica se ora c'e' una session valida
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (session?.user?.email) {
          console.log('[Login] Recovery session catturata, navigo a ResetPassword');
          navigation.replace('ResetPassword');
        } else {
          console.warn('[Login] Recovery flag presente ma NESSUNA sessione recuperabile');
        }
      } finally {
        if (!cancelled) setExchanging(false);
      }
    })();
    return () => { cancelled = true; };
  }, [recoveryDetected]);

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
      const emailLow = email.trim().toLowerCase();
      const isAdminEmail = emailLow === ADMIN_CREDENTIALS.email.toLowerCase();

      if (mode === 'admin' || isAdminEmail) {
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
          if (biometricAvailable && Platform.OS !== 'web') {
            const alreadyEnabled = global.__biometricEnabled;
            if (!alreadyEnabled) {
              Alert.alert(
                'Accesso biometrico',
                "Vuoi attivare l'accesso con impronta digitale per i prossimi accessi?",
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
          showAlert('📧 Email non confermata', "Clicca il link che ti abbiamo inviato per attivare l'account, poi riprova ad accedere.");
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
    const emailLow = email.trim().toLowerCase();
    try {
      await supabase.auth.resetPasswordForEmail(emailLow, {
        redirectTo: 'https://the-hair-studio.vercel.app',
      });
      // Vai direttamente alla schermata di reset: l'utente puo' inserire il codice ricevuto
      // via email (6 cifre) senza dover cliccare il link che spesso si rompe sui mobile.
      navigation.navigate('ResetPassword', { email: emailLow });
    } catch (e) {
      console.error('[Login] resetPasswordForEmail errore:', e);
      showAlert('Errore', "Impossibile inviare l'email. Riprova tra qualche secondo.");
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
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >

          <View style={styles.header}>
            <View style={styles.logoMini}>
              <Text style={styles.logoIcon}>✂</Text>
            </View>
            <Text style={styles.title}>THE HAIR STUDIO</Text>
            <Text style={styles.subtitle}>Noci • Puglia</Text>
          </View>

          {recoveryDetected && (
            <View style={styles.recoveryBanner}>
              <Text style={styles.recoveryIcon}>{exchanging ? '⏳' : '⚠️'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.recoveryTitle}>
                  {exchanging ? 'Apertura link di reset...' : 'Link di reset non completato'}
                </Text>
                <Text style={styles.recoverySub}>
                  {exchanging
                    ? 'Sto verificando il link, attendi qualche secondo.'
                    : 'Il link potrebbe essere stato aperto su un browser diverso da quello in cui hai richiesto il reset. Chiedi un nuovo link e completalo SULLO STESSO browser/dispositivo.'}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.tabContainer}>
            <Animated.View style={[styles.tabIndicator, { left: tabIndicatorLeft }]} />
            <TouchableOpacity style={styles.tab} onPress={() => switchMode('user')}>
              <View style={styles.tabInner}>
                <Text style={{ fontSize: 15, color: mode === 'user' ? '#000' : 'rgba(255,255,255,0.5)' }}>👤</Text>
                <Text style={[styles.tabText, mode === 'user' && styles.tabTextActive]}> Cliente</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tab} onPress={() => switchMode('admin')}>
              <View style={styles.tabInner}>
                <Text style={{ fontSize: 15, color: mode === 'admin' ? '#000' : 'rgba(255,255,255,0.5)' }}>🔒</Text>
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
                <Text style={styles.inputIcon}>📧</Text>
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
                <Text style={styles.inputIcon}>🔒</Text>
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
                  <Text style={styles.showPassIcon}>{showPass ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {mode === 'user' && (
              <TouchableOpacity style={styles.rememberRow} onPress={() => setRememberMe(!rememberMe)}>
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Text style={styles.checkmark}>✓</Text>}
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
                  <Text style={styles.loginBtnIcon}>
                    {loading ? '⏳' : mode === 'admin' ? '🛡️' : '→'}
                  </Text>
                  <Text style={styles.loginButtonText}>
                    {loading ? 'Accesso...' : mode === 'admin' ? 'Accedi come Admin' : 'Entra'}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {mode === 'user' && (
              <TouchableOpacity
                style={styles.registerLinkInline}
                onPress={() => navigation.replace('Register')}
              >
                <Text style={styles.registerLinkText}>
                  Non hai un account?{' '}
                  <Text style={styles.registerLinkBold}>Registrati</Text>
                </Text>
              </TouchableOpacity>
            )}

            {biometricAvailable && mode === 'user' && (
              <TouchableOpacity style={styles.biometricBtn} onPress={handleBiometric}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 20 }}>🖐️</Text>
                  <Text style={styles.biometricText}>Accedi con impronta digitale</Text>
                </View>
              </TouchableOpacity>
            )}

            {mode === 'user' && (
              <TouchableOpacity style={styles.forgotBtn} onPress={handleForgotPassword}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 14 }}>🔑</Text>
                  <Text style={styles.forgotText}>Recupera password</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {!isCompact && (
            <View style={styles.footer}>
              <View style={styles.footerRow}>
                <Text style={styles.footerIcon}>📍</Text>
                <Text style={styles.footerText}> Via Alessandro Manzoni, 38 • Noci (BA)</Text>
              </View>
              <View style={styles.footerRow}>
                <Text style={styles.footerIcon}>📞</Text>
                <Text style={styles.footerText}> +39 328 594 4459</Text>
              </View>
            </View>
          )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Default: schermo tall. Override -> stylesCompact su isCompact=true
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
    justifyContent: 'center',
  },
  header: { alignItems: 'center', marginBottom: 24 },
  logoMini: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderWidth: 2, borderColor: '#C9A84C',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
    shadowColor: '#C9A84C', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 15, elevation: 8,
  },
  logoIcon: { fontSize: 30, color: '#C9A84C' },
  title: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', letterSpacing: 5 },
  subtitle: { fontSize: 11, color: '#C9A84C', letterSpacing: 3, marginTop: 3 },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12, padding: 3, marginBottom: 18, position: 'relative',
  },
  tabIndicator: {
    position: 'absolute', top: 3, bottom: 3,
    width: '48.5%', backgroundColor: '#C9A84C', borderRadius: 9,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabInner: { flexDirection: 'row', alignItems: 'center' },
  tabText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  tabTextActive: { color: '#000000' },
  formContainer: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)',
  },
  formTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 2 },
  formSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 16 },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 11, color: '#C9A84C', fontWeight: '600', marginBottom: 5, letterSpacing: 1 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)',
    paddingHorizontal: 12, height: 46,
  },
  inputIcon: { fontSize: 16, marginRight: 8 },
  input: { flex: 1, color: '#FFFFFF', fontSize: 15 },
  showPassIcon: { fontSize: 18, paddingLeft: 6 },
  loginBtnIcon: { fontSize: 16, color: '#000000' },
  loginButton: { marginTop: 4, borderRadius: 12, overflow: 'hidden' },
  loginButtonDisabled: { opacity: 0.6 },
  loginGradient: { paddingVertical: 13, alignItems: 'center' },
  loginButtonText: { color: '#000000', fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  biometricBtn: {
    marginTop: 10, paddingVertical: 10, alignItems: 'center',
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)',
    backgroundColor: 'rgba(201,168,76,0.05)',
  },
  biometricText: { color: '#C9A84C', fontWeight: '700', fontSize: 13 },
  footer: { alignItems: 'center', marginTop: 18, gap: 4 },
  footerRow: { flexDirection: 'row', alignItems: 'center' },
  footerIcon: { fontSize: 10, color: 'rgba(255,255,255,0.35)' },
  footerText: { color: 'rgba(255,255,255,0.35)', fontSize: 10 },
  registerLinkInline: { alignItems: 'center', marginTop: 10, paddingVertical: 4 },
  registerLinkText: { color: 'rgba(255,255,255,0.55)', fontSize: 13 },
  registerLinkBold: { color: '#C9A84C', fontWeight: '700' },
  forgotBtn: { marginTop: 8, alignItems: 'center', paddingVertical: 6 },
  forgotText: { color: 'rgba(201,168,76,0.7)', fontSize: 13, fontWeight: '600' },
  recoveryBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(243,156,18,0.12)',
    borderRadius: 10, padding: 10, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(243,156,18,0.4)',
  },
  recoveryIcon: { fontSize: 20 },
  recoveryTitle: { color: '#f39c12', fontWeight: '800', fontSize: 12, marginBottom: 2 },
  recoverySub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, lineHeight: 14 },
  rememberRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 2, gap: 8 },
  checkbox: {
    width: 20, height: 20, borderRadius: 5,
    borderWidth: 1.5, borderColor: '#C9A84C',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#C9A84C' },
  checkmark: { color: '#000', fontSize: 13, fontWeight: '900' },
  rememberText: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
});
