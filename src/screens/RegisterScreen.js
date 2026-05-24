import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ScrollView,
  Dimensions, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';

const { width } = Dimensions.get('window');

export default function RegisterScreen({ navigation }) {
  const { registerUser } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const showAlert = (title, msg) => {
    if (Platform.OS === 'web') window.alert(`${title}\n\n${msg}`);
    else Alert.alert(title, msg);
  };

  const handleRegister = async () => {
    if (!name.trim()) { showAlert('Attenzione', 'Inserisci il nome completo'); return; }
    if (!email.trim() || !email.includes('@')) { showAlert('Attenzione', 'Inserisci un indirizzo email valido'); return; }
    if (!phone.trim()) { showAlert('Attenzione', 'Inserisci il numero di telefono'); return; }
    if (password.length < 6) { showAlert('Attenzione', 'La password deve essere di almeno 6 caratteri'); return; }
    if (password !== confirmPassword) { showAlert('Attenzione', 'Le password non coincidono'); return; }

    setLoading(true);
    const result = await registerUser(name.trim(), email.trim().toLowerCase(), phone.trim(), password);
    setLoading(false);

    if (result === true) {
      navigation.replace('Welcome', { userName: name.trim() });
    } else if (result === 'confirm') {
      if (Platform.OS === 'web') {
        window.alert(`📧 Controlla la tua email!\n\nAbbiamo inviato un link di conferma a ${email.trim()}.\n\nClicca il link per attivare il tuo account, poi accedi.`);
        navigation.replace('Login');
      } else {
        Alert.alert(
          '📧 Controlla la tua email!',
          `Abbiamo inviato un link di conferma a ${email.trim()}.\n\nClicca il link per attivare il tuo account, poi accedi.`,
          [{ text: 'OK', onPress: () => navigation.replace('Login') }]
        );
      }
    } else {
      showAlert('Errore', 'Email già registrata oppure servizio non disponibile. Prova ad accedere.');
    }
  };

  return (
    <LinearGradient colors={['#0A0A0A', '#1A1209', '#0A0A0A']} style={styles.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.backIcon}>‹</Text>
            </TouchableOpacity>
            <View style={styles.logoMini}>
              <Text style={styles.logoIcon}>✂</Text>
            </View>
            <Text style={styles.title}>REGISTRATI</Text>
            <Text style={styles.subtitle}>Crea il tuo account</Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Nuovo Account</Text>
            <Text style={styles.formSubtitle}>Inserisci i tuoi dati per iniziare</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>NOME COMPLETO</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>👤</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Es. Giovanni Rossi"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>EMAIL</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>📧</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Es. giovanni@email.com"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>TELEFONO</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>📱</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+39 000 000 0000"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>PASSWORD</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Min. 6 caratteri"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                  <Text style={styles.showPass}>{showPass ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>CONFERMA PASSWORD</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>🔐</Text>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Ripeti la password"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPass}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowConfirmPass(!showConfirmPass)}>
                  <Text style={styles.showPass}>{showConfirmPass ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.registerButton, loading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              <LinearGradient
                colors={['#C9A84C', '#A87C30']}
                style={styles.registerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.registerButtonText}>
                  {loading ? '⏳ Registrazione...' : '✅ Registrati'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation.replace('Login')}
            >
              <Text style={styles.loginLinkText}>
                Hai gia' un account?{' '}
                <Text style={styles.loginLinkBold}>Accedi</Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer info */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>📍 Via Alessandro Manzoni, 38 • Noci (BA)</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 50, paddingBottom: 30 },
  header: { alignItems: 'center', marginBottom: 32, position: 'relative' },
  backBtn: {
    position: 'absolute', left: 0, top: 0,
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
  },
  backIcon: { color: '#C9A84C', fontSize: 32 },
  logoMini: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderWidth: 2, borderColor: '#C9A84C',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    shadowColor: '#C9A84C', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  logoIcon: { fontSize: 26, color: '#C9A84C' },
  title: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', letterSpacing: 6 },
  subtitle: { fontSize: 12, color: '#C9A84C', letterSpacing: 3, marginTop: 4 },
  formContainer: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)',
  },
  formTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  formSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 24 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 11, color: '#C9A84C', fontWeight: '600', marginBottom: 8, letterSpacing: 1 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)',
    paddingHorizontal: 14, height: 52,
  },
  inputIcon: { fontSize: 18, marginRight: 10 },
  input: { flex: 1, color: '#FFFFFF', fontSize: 16 },
  showPass: { fontSize: 20, paddingLeft: 8 },
  registerButton: { marginTop: 8, borderRadius: 14, overflow: 'hidden' },
  registerButtonDisabled: { opacity: 0.6 },
  registerGradient: { paddingVertical: 16, alignItems: 'center' },
  registerButtonText: { color: '#000000', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  loginLink: { marginTop: 18, alignItems: 'center' },
  loginLinkText: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  loginLinkBold: { color: '#C9A84C', fontWeight: '700' },
  footer: { alignItems: 'center', marginTop: 28 },
  footerText: { color: 'rgba(255,255,255,0.35)', fontSize: 11 },
});
