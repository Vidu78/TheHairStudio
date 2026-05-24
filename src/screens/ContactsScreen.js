import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Linking, Platform, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const WHATSAPP_NUMBER = '393494490632';
const DEV_EMAIL = 'vincedurante@gmail.com';
const DEV_NAME = 'Vincenzo Durante';

const openWhatsApp = () => {
  const msg = encodeURIComponent(
    'Ciao Vincenzo! Ho visto l\'app di The Hair Studio e sono interessato a crearne una per la mia attività. Possiamo parlarne?'
  );
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
  Linking.openURL(url).catch(() =>
    Linking.openURL(`https://web.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${msg}`)
  );
};

const openEmail = () => {
  const subject = encodeURIComponent('Richiesta sviluppo app personalizzata');
  const body = encodeURIComponent(
    'Ciao Vincenzo,\n\nHo visto l\'app di The Hair Studio e mi piacerebbe averne una per la mia attività.\n\nPuoi contattarmi per un preventivo?\n\nGrazie!'
  );
  Linking.openURL(`mailto:${DEV_EMAIL}?subject=${subject}&body=${body}`);
};

const FEATURES = [
  { emoji: '📅', text: 'Sistema prenotazioni online' },
  { emoji: '👥', text: 'Gestione clienti e profili' },
  { emoji: '🔔', text: 'Notifiche e promemoria' },
  { emoji: '📊', text: 'Dashboard amministratore' },
  { emoji: '📱', text: 'App iOS, Android e PWA web' },
  { emoji: '🎨', text: 'Design personalizzato sul tuo brand' },
];

export default function ContactsScreen() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={['#0A0A0A', '#141414']} style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarIcon}>💻</Text>
        </View>
        <Text style={styles.devName}>{DEV_NAME}</Text>
        <Text style={styles.devTagline}>Sviluppatore App Mobile</Text>

        <View style={styles.badgeRow}>
          {[
            { emoji: '📱', label: 'React Native' },
            { emoji: '🌐', label: 'PWA' },
            { emoji: '🏪', label: 'Business App' },
          ].map((b, i) => (
            <View key={i} style={styles.badge}>
              <Text style={styles.badgeEmoji}>{b.emoji}</Text>
              <Text style={styles.badgeText}>{b.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {/* Card promo */}
        <View style={styles.section}>
          <View style={styles.promoCard}>
            <LinearGradient
              colors={['rgba(201,168,76,0.12)', 'rgba(201,168,76,0.04)']}
              style={styles.promoGrad}
            >
              <Text style={styles.promoEmoji}>🚀</Text>
              <Text style={styles.promoTitle}>
                Realizzazione app personalizzate{'\n'}per la tua attività
              </Text>
              <Text style={styles.promoDesc}>
                Ti è piaciuta questa app? Posso crearne una su misura per il tuo salone,
                negozio, studio o qualsiasi attività commerciale.{'\n\n'}
                Design professionale, prenotazioni online, gestione clienti e molto altro.
              </Text>
            </LinearGradient>
          </View>
        </View>

        {/* Cosa offro */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cosa include</Text>
          <View style={styles.featureCard}>
            {FEATURES.map((item, i) => (
              <View key={i} style={[styles.featureRow, i > 0 && styles.featureRowBorder]}>
                <View style={styles.featureIconWrap}>
                  <Text style={styles.featureEmoji}>{item.emoji}</Text>
                </View>
                <Text style={styles.featureText}>{item.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Contatti */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contatti</Text>
          <View style={styles.salonCard}>

            <TouchableOpacity style={styles.infoRow} onPress={openEmail}>
              <View style={styles.infoIconWrap}>
                <Text style={styles.infoEmoji}>📧</Text>
              </View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={[styles.infoText, { color: '#C9A84C' }]}>{DEV_EMAIL}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            <TouchableOpacity style={styles.infoRow} onPress={openWhatsApp}>
              <View style={[styles.infoIconWrap, { backgroundColor: 'rgba(37,211,102,0.1)' }]}>
                <Text style={styles.infoEmoji}>💬</Text>
              </View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>WhatsApp</Text>
                <Text style={styles.infoText}>Scrivimi direttamente</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

          </View>
        </View>

        {/* CTA */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.ctaBtn} onPress={openWhatsApp}>
            <LinearGradient
              colors={['#25D366', '#1DA851']}
              style={styles.ctaGrad}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <Text style={styles.ctaBtnEmoji}>💬</Text>
              <Text style={styles.ctaText}>Contattami su WhatsApp</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.emailBtn} onPress={openEmail}>
            <Text style={styles.emailBtnEmoji}>📧</Text>
            <Text style={styles.emailBtnText}>Oppure scrivi via email</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerNote}>
          Questa app è stata realizzata da {DEV_NAME}.{'\n'}
          Rispondo entro 24 ore lavorative.
        </Text>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },

  header: { paddingTop: 60, paddingBottom: 24, alignItems: 'center', paddingHorizontal: 20 },
  avatar: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderWidth: 3, borderColor: '#C9A84C',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarIcon: { fontSize: 44 },
  devName: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  devTagline: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(201,168,76,0.1)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.25)',
  },
  badgeEmoji: { fontSize: 12 },
  badgeText: { color: '#C9A84C', fontSize: 11, fontWeight: '700' },

  content: { flex: 1 },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginBottom: 14 },

  promoCard: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)' },
  promoGrad: { padding: 24, alignItems: 'center' },
  promoEmoji: { fontSize: 40, marginBottom: 14 },
  promoTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 14, lineHeight: 26 },
  promoDesc: { fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 22 },

  featureCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden',
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 14 },
  featureRowBorder: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  featureIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(201,168,76,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  featureEmoji: { fontSize: 18 },
  featureText: { color: 'rgba(255,255,255,0.75)', fontSize: 14, flex: 1 },

  salonCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.15)', overflow: 'hidden',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  rowDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 16 },
  infoIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(201,168,76,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  infoEmoji: { fontSize: 20 },
  infoTextWrap: { flex: 1 },
  infoLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 2 },
  infoText: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: '600' },
  chevron: { color: 'rgba(255,255,255,0.3)', fontSize: 22 },

  ctaBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  ctaGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
  ctaBtnEmoji: { fontSize: 22 },
  ctaText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },

  emailBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14,
    backgroundColor: 'rgba(201,168,76,0.06)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)',
  },
  emailBtnEmoji: { fontSize: 18 },
  emailBtnText: { color: '#C9A84C', fontSize: 14, fontWeight: '700' },

  footerNote: {
    color: 'rgba(255,255,255,0.25)', fontSize: 12,
    textAlign: 'center', lineHeight: 18,
    marginTop: 16, marginHorizontal: 20,
  },
});
