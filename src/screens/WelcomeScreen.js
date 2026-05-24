import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, StatusBar, Image,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

const LOGO = require('../../assets/images/logo The Hair Studio.jpg');

const { width } = Dimensions.get('window');

const GUIDE_STEPS = [
  {
    icon: '✂️',
    title: 'Scegli il Servizio',
    desc: 'Sfoglia i nostri servizi dalla Home',
    color: '#C9A84C',
  },
  {
    icon: '📅',
    title: 'Prenota',
    desc: 'Scegli barbiere, data e orario disponibile',
    color: '#4ECDC4',
  },
  {
    icon: '👤',
    title: 'Gestisci',
    desc: 'Consulta e cancella le prenotazioni dal tuo profilo',
    color: '#45B7D1',
  },
  {
    icon: '🔄',
    title: 'Periodica',
    desc: 'Imposta prenotazioni ricorrenti automatiche',
    color: '#96CEB4',
  },
];

export default function WelcomeScreen({ navigation, route }) {
  const userName = route?.params?.userName || 'Cliente';

  return (
    <LinearGradient colors={['#0A0A0A', '#1A1209', '#0A0A0A']} style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Image source={LOGO} style={styles.logoImage} resizeMode="contain" />
        </View>

        {/* Welcome message */}
        <View style={styles.welcomeBox}>
          <LinearGradient
            colors={['rgba(201,168,76,0.15)', 'rgba(201,168,76,0.05)']}
            style={styles.welcomeGrad}
          >
            <Text style={styles.welcomeEmoji}>🎉</Text>
            <Text style={styles.welcomeTitle}>Benvenuto in{'\n'}The Hair Studio!</Text>
            <Text style={styles.welcomeName}>Ciao, {userName}!</Text>
            <Text style={styles.welcomeDesc}>
              Il tuo account e' stato creato con successo.{'\n'}
              Ecco come funziona la nostra app.
            </Text>
          </LinearGradient>
        </View>

        {/* Guide steps */}
        <Text style={styles.guideTitle}>Come funziona</Text>

        {GUIDE_STEPS.map((step, i) => (
          <View key={i} style={styles.stepCard}>
            <View style={[styles.stepNumCircle, { backgroundColor: `${step.color}20`, borderColor: `${step.color}50` }]}>
              <Text style={[styles.stepNumText, { color: step.color }]}>{i + 1}</Text>
            </View>
            <View style={styles.stepIconBox}>
              <Text style={styles.stepIcon}>{step.icon}</Text>
            </View>
            <View style={styles.stepInfo}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDesc}>{step.desc}</Text>
            </View>
          </View>
        ))}

        {/* Divider */}
        <View style={styles.divider} />

        {/* Tips */}
        <View style={styles.tipsBox}>
          <Text style={styles.tipsTitle}>💡 Lo sapevi?</Text>
          <Text style={styles.tipsText}>
            Con la prenotazione periodica puoi risparmiare fino al 10% sul prezzo del servizio
            e non dimenticare mai il tuo appuntamento!
          </Text>
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          style={styles.startBtn}
          onPress={() => navigation.replace('MainTabs')}
        >
          <LinearGradient
            colors={['#C9A84C', '#A87C30']}
            style={styles.startGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.startBtnText}>✂️ Inizia!</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 30 },

  header: { alignItems: 'center', marginBottom: 28 },
  logoImage: { width: 300, height: 180 },

  welcomeBox: {
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)',
    marginBottom: 28,
  },
  welcomeGrad: { padding: 24, alignItems: 'center' },
  welcomeEmoji: { fontSize: 36, marginBottom: 10 },
  welcomeTitle: {
    fontSize: 24, fontWeight: '800', color: '#FFFFFF',
    textAlign: 'center', marginBottom: 8,
  },
  welcomeName: {
    fontSize: 18, fontWeight: '700', color: '#C9A84C',
    marginBottom: 12,
  },
  welcomeDesc: {
    fontSize: 14, color: 'rgba(255,255,255,0.6)',
    textAlign: 'center', lineHeight: 20,
  },

  guideTitle: {
    fontSize: 18, fontWeight: '800', color: '#FFFFFF',
    marginBottom: 16,
  },

  stepCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.15)',
  },
  stepNumCircle: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  stepNumText: { fontSize: 13, fontWeight: '900' },
  stepIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(201,168,76,0.1)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  stepIcon: { fontSize: 22 },
  stepInfo: { flex: 1 },
  stepTitle: { color: '#FFFFFF', fontWeight: '700', fontSize: 15, marginBottom: 4 },
  stepDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 18 },

  divider: {
    height: 1, backgroundColor: 'rgba(201,168,76,0.2)',
    marginVertical: 20,
  },

  tipsBox: {
    backgroundColor: 'rgba(201,168,76,0.08)',
    borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.25)',
    marginBottom: 24,
  },
  tipsTitle: { color: '#C9A84C', fontWeight: '800', fontSize: 14, marginBottom: 8 },
  tipsText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 20 },

  startBtn: { borderRadius: 16, overflow: 'hidden' },
  startGradient: { paddingVertical: 18, alignItems: 'center' },
  startBtnText: { color: '#000000', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
});
