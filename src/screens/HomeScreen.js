import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, StatusBar, Image, Alert, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { SERVICES, SALON_INFO, BARBERS, BARBER_PHOTOS } from '../data/appData';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const { currentUser, logout } = useApp();

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Vuoi uscire dall\'account?')) {
        logout();
        navigation.replace('Login');
      }
    } else {
      Alert.alert('Logout', 'Vuoi uscire dall\'account?', [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Esci', style: 'destructive', onPress: () => { logout(); navigation.replace('Login'); } },
      ]);
    }
  };
  const [selectedCategory, setSelectedCategory] = useState('all');

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Buongiorno' : now.getHours() < 18 ? 'Buon pomeriggio' : 'Buonasera';

  const categories = [
    { id: 'all',    label: 'Tutti',  emoji: '◻' },
    { id: 'taglio', label: 'Taglio', emoji: '✂️' },
    { id: 'barba',  label: 'Barba',  emoji: '💈' },
  ];

  const filteredServices = selectedCategory === 'all'
    ? SERVICES
    : SERVICES.filter(s => s.category === selectedCategory);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Hero Header */}
        <LinearGradient colors={['#0A0A0A', '#1A1209']} style={styles.hero}>
          <View style={styles.heroContent}>
            <View style={styles.greetingRow}>
              <View>
                <Text style={styles.greeting}>{greeting},</Text>
                <Text style={styles.userName}>{currentUser?.name || 'Ospite'}</Text>
              </View>
              <View style={styles.greetingActions}>
                <View style={styles.ratingBadge}>
                  <Text style={styles.starIcon}>★</Text>
                  <Text style={styles.ratingText}> {SALON_INFO.rating}</Text>
                </View>
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                  <Text style={styles.logoutIcon}>⎋</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Noci City Card */}
            <View style={styles.cityCard}>
              <LinearGradient
                colors={['rgba(201,168,76,0.15)', 'rgba(201,168,76,0.05)']}
                style={styles.cityCardGradient}
              >
                <View style={styles.nociSkyline}>
                  <Text style={styles.nociLabel}>✦ NOCI • PUGLIA ✦</Text>
                  <View style={styles.skylineRow}>
                    {[35, 28, 42, 30, 38, 25, 32].map((h, i) => (
                      <View key={i} style={styles.building}>
                        <View style={[styles.buildingTop, { borderBottomWidth: h * 0.5 }]} />
                        <View style={[styles.buildingBody, { height: h, width: 14 + (i % 3) * 4 }]} />
                      </View>
                    ))}
                  </View>
                  <Text style={styles.salonTagInCity}>THE HAIR STUDIO</Text>
                  <Text style={styles.salonAddrInCity}>Via Alessandro Manzoni, 38</Text>
                </View>
              </LinearGradient>
            </View>

            {/* Quick Stats */}
            <View style={styles.quickStats}>
              <View style={styles.statItem}>
                <Text style={styles.statEmoji}>🕐</Text>
                <Text style={styles.statLabel}>Aperto oggi</Text>
                <Text style={styles.statValue}>8:30 - 21:00</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statEmoji}>📞</Text>
                <Text style={styles.statLabel}>Telefono</Text>
                <Text style={styles.statValue}>328 594 4459</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statEmoji}>📍</Text>
                <Text style={styles.statLabel}>Dove siamo</Text>
                <Text style={styles.statValue}>Noci (BA)</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Book CTA */}
        <View style={styles.ctaSection}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Booking')}
            style={styles.bookButton}
          >
            <LinearGradient
              colors={['#C9A84C', '#A87C30']}
              style={styles.bookGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <Text style={styles.bookBtnEmoji}>📅</Text>
              <View>
                <Text style={styles.bookButtonText}>Prenota Ora</Text>
                <Text style={styles.bookButtonSub}>Scegli data e servizio</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('PeriodicBooking')}
            style={styles.periodicButton}
          >
            <LinearGradient
              colors={['rgba(201,168,76,0.15)', 'rgba(201,168,76,0.08)']}
              style={styles.periodicGradient}
            >
              <Text style={styles.periodicEmoji}>🔄</Text>
              <View>
                <Text style={styles.periodicText}>Prenotazione Periodica</Text>
                <Text style={styles.periodicSub}>Settimanale / Mensile</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* I Nostri Barbieri */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>I Nostri Barbieri</Text>
          <View style={styles.barbersRow}>
            {BARBERS.map(barber => (
              <View key={barber.id} style={styles.barberCard}>
                <Image
                  source={BARBER_PHOTOS[barber.id]}
                  style={styles.barberPhoto}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.95)']}
                  style={styles.barberNameOverlay}
                >
                  <Text style={styles.barberName} numberOfLines={1} adjustsFontSizeToFit>{barber.name}</Text>
                  <Text style={styles.barberRole} numberOfLines={1}>{barber.role}</Text>
                </LinearGradient>
              </View>
            ))}
          </View>
        </View>

        {/* Servizi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>I Nostri Servizi</Text>

          {/* Category Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Text style={[styles.catEmoji, { opacity: selectedCategory === cat.id ? 1 : 0.6 }]}>
                  {cat.emoji}
                </Text>
                <Text style={[styles.catLabel, selectedCategory === cat.id && styles.catLabelActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Service Grid */}
          <View style={styles.servicesGrid}>
            {filteredServices.map(service => (
              <TouchableOpacity
                key={service.id}
                style={styles.serviceCard}
                onPress={() => navigation.navigate('Booking', { selectedService: service })}
              >
                <View style={styles.serviceIconWrap}>
                  {service.emoji2 ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                      <Text style={styles.serviceEmoji}>{service.emoji}</Text>
                      <Text style={styles.serviceEmoji}>{service.emoji2}</Text>
                    </View>
                  ) : (
                    <Text style={styles.serviceEmojiLg}>{service.emoji}</Text>
                  )}
                </View>
                <Text style={styles.serviceName}>{service.name}</Text>
                <View style={styles.serviceDetails}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={styles.clockEmoji}>⏱</Text>
                    <Text style={styles.serviceTime}>{service.duration} min</Text>
                  </View>
                  <Text style={styles.servicePrice}>€{service.price}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Orari */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Orari di Apertura</Text>
          <View style={styles.hoursCard}>
            {[
              { day: 'Lunedì',          hours: 'Chiuso' },
              { day: 'Martedì - Venerdì', hours: '8:30 - 13:00 | 15:00 - 21:00' },
              { day: 'Sabato',           hours: '8:30 - 20:30' },
              { day: 'Domenica',         hours: 'Chiuso' },
            ].map((item, i) => (
              <View key={i} style={[styles.hourRow, i > 0 && styles.hourRowBorder]}>
                <Text style={styles.hourDay}>{item.day}</Text>
                <Text style={[styles.hourTime, item.hours === 'Chiuso' && styles.hourClosed]}>
                  {item.hours}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },
  hero: { paddingBottom: 20 },
  heroContent: { paddingTop: 50, paddingHorizontal: 20 },
  greetingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  userName: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  greetingActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ratingBadge: {
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row',
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)',
  },
  starIcon: { color: '#C9A84C', fontSize: 13 },
  ratingText: { color: '#C9A84C', fontWeight: '800', fontSize: 13 },
  logoutBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  logoutIcon: { color: 'rgba(255,255,255,0.5)', fontSize: 18 },

  cityCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)' },
  cityCardGradient: { padding: 16 },
  nociSkyline: { alignItems: 'center' },
  nociLabel: { color: '#C9A84C', fontSize: 10, letterSpacing: 3, marginBottom: 12 },
  skylineRow: { flexDirection: 'row', alignItems: 'flex-end', height: 50, gap: 4, marginBottom: 10 },
  building: { alignItems: 'center' },
  buildingTop: {
    width: 0, height: 0,
    borderLeftWidth: 9, borderRightWidth: 9,
    borderStyle: 'solid',
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderBottomColor: 'rgba(201,168,76,0.5)',
  },
  buildingBody: { backgroundColor: 'rgba(201,168,76,0.25)', borderRadius: 2 },
  salonTagInCity: { color: '#FFFFFF', fontWeight: '900', fontSize: 16, letterSpacing: 4 },
  salonAddrInCity: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 4 },

  quickStats: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 10 },
  statEmoji: { fontSize: 20, marginBottom: 4 },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 },
  statValue: { fontSize: 11, color: '#C9A84C', fontWeight: '700' },

  ctaSection: { padding: 20, gap: 12 },
  bookButton: { borderRadius: 16, overflow: 'hidden', elevation: 8 },
  bookGradient: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14 },
  bookBtnEmoji: { fontSize: 28 },
  bookButtonText: { fontSize: 18, fontWeight: '800', color: '#000000' },
  bookButtonSub: { fontSize: 12, color: 'rgba(0,0,0,0.6)' },
  chevron: { color: '#000000', fontSize: 28, marginLeft: 'auto', fontWeight: '300' },

  periodicButton: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)' },
  periodicGradient: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  periodicEmoji: { fontSize: 26 },
  periodicText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  periodicSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },

  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 14, letterSpacing: 0.5 },

  barbersRow: { flexDirection: 'row', gap: 8 },
  barberCard: { flex: 1, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)' },
  barberPhoto: { width: '100%', height: 170 },
  barberNameOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingTop: 30, paddingBottom: 10, alignItems: 'center',
  },
  barberName: { color: '#FFFFFF', fontWeight: '900', fontSize: 12, textAlign: 'center', paddingHorizontal: 4 },
  barberRole: { color: '#C9A84C', fontSize: 9, fontWeight: '600', marginTop: 2 },

  categoryScroll: { marginBottom: 14 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  categoryChipActive: { backgroundColor: 'rgba(201,168,76,0.2)', borderColor: '#C9A84C' },
  catEmoji: { fontSize: 14 },
  catLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  catLabelActive: { color: '#C9A84C', fontWeight: '700' },

  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  serviceCard: {
    width: (width - 52) / 2,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: 'rgba(201,168,76,0.15)',
  },
  serviceIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(201,168,76,0.1)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  serviceEmoji: { fontSize: 18 },
  serviceEmojiLg: { fontSize: 24 },
  serviceName: { color: '#FFFFFF', fontWeight: '700', fontSize: 14, marginBottom: 8 },
  serviceDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clockEmoji: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  serviceTime: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
  servicePrice: { color: '#C9A84C', fontWeight: '800', fontSize: 16 },

  hoursCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.15)', overflow: 'hidden',
  },
  hourRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16 },
  hourRowBorder: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  hourDay: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  hourTime: { color: '#C9A84C', fontSize: 13 },
  hourClosed: { color: 'rgba(255,255,255,0.3)' },
});
