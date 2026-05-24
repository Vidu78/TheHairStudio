import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Linking, Platform, Modal, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { SALON_INFO } from '../data/appData';
import { supabase } from '../config/supabase';
import { buildGoogleCalendarUrl } from '../utils/emailService';

function StarRating({ bookingId, rating, onRate }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3, marginTop: 8 }}>
      <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginRight: 2, alignSelf: 'center' }}>
        Il tuo voto:
      </Text>
      {[1, 2, 3, 4, 5].map(star => (
        <TouchableOpacity key={star} onPress={() => onRate(bookingId, star)} activeOpacity={0.7}>
          <Text style={{ fontSize: 18 }}>{star <= rating ? '⭐' : '☆'}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function ProfileScreen({ navigation }) {
  const { currentUser, logout, bookings, periodicBookings, cancelBooking, fetchBookings } = useApp();
  const [showInfo, setShowInfo]         = useState(false);
  const [ratings, setRatings]           = useState({});
  const [phoneInput, setPhoneInput]     = useState('');
  const [isEditingPhone, setIsEditing]  = useState(false);
  const [phoneSaving, setPhoneSaving]   = useState(false);

  useEffect(() => { fetchBookings(); }, []);

  useEffect(() => {
    setPhoneInput(currentUser?.phone || '');
  }, [currentUser]);

  const handleSavePhone = async () => {
    if (!currentUser?.id) return;
    setPhoneSaving(true);
    try {
      await Promise.race([
        supabase.from('profiles').update({ phone: phoneInput.trim() }).eq('id', currentUser.id),
        new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 5000)),
      ]);
      setIsEditing(false);
    } catch (_) {
      Alert.alert('Errore', 'Impossibile salvare il numero. Riprova.');
    } finally {
      setPhoneSaving(false);
    }
  };

  // Carica ratings esistenti dalle prenotazioni confermate
  useEffect(() => {
    const confirmed = bookings.filter(b => b.status === 'confirmed' && b.rating);
    if (confirmed.length > 0) {
      const map = {};
      confirmed.forEach(b => { map[b.id] = b.rating; });
      setRatings(map);
    }
  }, [bookings]);

  const handleRate = async (bookingId, star) => {
    setRatings(prev => ({ ...prev, [bookingId]: star }));
    try {
      await Promise.race([
        supabase.from('bookings').update({ rating: star }).eq('id', bookingId),
        new Promise((_, r) => setTimeout(() => r(new Error('sb_timeout')), 5000)),
      ]);
    } catch (_) {}
  };

  const handleCancelBooking = (bookingId) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Vuoi annullare questa prenotazione?')) {
        cancelBooking(bookingId);
      }
    } else {
      Alert.alert('Annulla prenotazione', 'Sei sicuro di voler annullare?', [
        { text: 'No', style: 'cancel' },
        { text: 'Sì, annulla', style: 'destructive', onPress: () => cancelBooking(bookingId) },
      ]);
    }
  };

  const myBookings = bookings.filter(b =>
    (currentUser?.id && b.clientId === currentUser.id) ||
    (b.clientName && currentUser?.name && b.clientName === currentUser.name)
  );
  const userBookings = myBookings;

  const myPeriodicBookings = periodicBookings.filter(b =>
    (currentUser?.id && b.clientId === currentUser.id) ||
    (b.clientName && currentUser?.name && b.clientName === currentUser.name)
  );

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm("Vuoi uscire dall'app?")) logout();
      return;
    }
    Alert.alert('Logout', 'Vuoi uscire dall\'app?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Esci', style: 'destructive', onPress: logout },
    ]);
  };

  const openPhone = () => Linking.openURL(`tel:${SALON_INFO.phone}`);

  const openMaps = () => {
    const address = encodeURIComponent(`${SALON_INFO.address}, ${SALON_INFO.city}`);
    const url = Platform.OS === 'ios'
      ? `maps://maps.apple.com/?q=${address}`
      : `https://maps.google.com/?q=${address}`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://maps.google.com/?q=${address}`)
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A0A0A', '#141414']} style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarIcon}>👤</Text>
        </View>
        <Text style={styles.userName}>{currentUser?.name || 'Ospite'}</Text>
        <Text style={styles.userEmail}>{currentUser?.email || currentUser?.phone || ''}</Text>

        {/* Stats personali */}
        <View style={styles.personalStats}>
          <View style={styles.pStatItem}>
            <Text style={styles.pStatValue}>{userBookings.length || 0}</Text>
            <Text style={styles.pStatLabel}>Prenotazioni</Text>
          </View>
          <View style={styles.pStatDivider} />
          <View style={styles.pStatItem}>
            <Text style={styles.pStatValue}>{myPeriodicBookings.length}</Text>
            <Text style={styles.pStatLabel}>Abbonamenti</Text>
          </View>
          <View style={styles.pStatDivider} />
          <View style={styles.pStatItem}>
            <Text style={styles.pStatValue}>⭐ {SALON_INFO.rating}</Text>
            <Text style={styles.pStatLabel}>Rating salon</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {/* Le mie prenotazioni */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Le Mie Prenotazioni</Text>
          {userBookings.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyText}>Nessuna prenotazione ancora</Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => navigation.navigate('Booking')}
              >
                <Text style={styles.emptyBtnText}>Prenota ora →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            userBookings.map(b => (
              <View key={b.id} style={[styles.bookingCard, b.status === 'cancelled' && styles.bookingCardCancelled]}>
                <View style={styles.bookingLeft}>
                  <Text style={styles.bookingService}>{b.service}</Text>
                  <Text style={styles.bookingDate}>{b.date} • {b.time}</Text>
                  <Text style={styles.bookingBarber}>{b.barber}</Text>
                  {b.status === 'confirmed' && (
                    <StarRating
                      bookingId={b.id}
                      rating={ratings[b.id] || 0}
                      onRate={handleRate}
                    />
                  )}
                  {b.status === 'confirmed' && (
                    <TouchableOpacity
                      style={styles.calendarBtn}
                      onPress={() => {
                        const url = buildGoogleCalendarUrl({ date: b.date, time: b.time, service: b.service, barber: b.barber, slots: b.slots || 1 });
                        Linking.openURL(url);
                      }}
                    >
                      <Text style={styles.calendarBtnText}>📅 Google Calendar</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.bookingRight}>
                  <Text style={styles.bookingPrice}>€{b.price}</Text>
                  <View style={[styles.statusBadge,
                    b.status === 'confirmed' && styles.statusConfirmed,
                    b.status === 'cancelled' && styles.statusCancelled]}>
                    <Text style={styles.statusText}>
                      {b.status === 'confirmed' ? 'Conf.' : b.status === 'cancelled' ? 'Ann.' : 'Pend.'}
                    </Text>
                  </View>
                  {b.status !== 'cancelled' && (
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => handleCancelBooking(b.id)}
                    >
                      <Text style={styles.cancelBtnText}>Annulla</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Abbonamenti attivi */}
        {myPeriodicBookings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔄 Abbonamenti Attivi</Text>
            {myPeriodicBookings.map(pb => (
              <View key={pb.id} style={styles.periodicCard}>
                <LinearGradient colors={['rgba(201,168,76,0.1)', 'rgba(201,168,76,0.04)']} style={styles.periodicGrad}>
                  <View style={styles.periodicTop}>
                    <Text style={styles.periodicPeriod}>{pb.periodLabel}</Text>
                    <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>ATTIVO</Text></View>
                  </View>
                  <Text style={styles.periodicDetail}>{pb.serviceIcon} {pb.service} • con {pb.barber}</Text>
                  <Text style={styles.periodicTime}>🕐 {pb.time}</Text>
                </LinearGradient>
              </View>
            ))}
          </View>
        )}

        {/* Info salone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Il Salone</Text>
          <View style={styles.salonCard}>
            <View style={styles.salonLogoRow}>
              <View style={styles.salonLogoMini}>
                <Text style={styles.salonLogoIcon}>✂</Text>
              </View>
              <View>
                <Text style={styles.salonName}>{SALON_INFO.name}</Text>
                <Text style={styles.salonRating}>⭐⭐⭐⭐⭐ {SALON_INFO.rating} ({SALON_INFO.reviewCount} recensioni)</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.infoRow} onPress={openPhone}>
              <Text style={styles.infoIcon}>📞</Text>
              <Text style={styles.infoText}>{SALON_INFO.phone}</Text>
              <Text style={styles.infoArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }]}
              onPress={openMaps}
            >
              <Text style={styles.infoIcon}>📍</Text>
              <Text style={[styles.infoText, { color: '#C9A84C' }]}>{SALON_INFO.address}, {SALON_INFO.city}</Text>
              <Text style={styles.infoArrow}>›</Text>
            </TouchableOpacity>

            <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }]}>
              <Text style={styles.infoIcon}>📸</Text>
              <Text style={styles.infoText}>{SALON_INFO.instagram}</Text>
            </View>
          </View>
        </View>

        {/* Numero di telefono per SMS reminder */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📱 Promemoria SMS</Text>
          <View style={styles.phoneCard}>
            <Text style={styles.phoneLabel}>Il tuo numero per i promemoria appuntamento:</Text>
            {isEditingPhone ? (
              <View style={styles.phoneEditRow}>
                <TextInput
                  style={styles.phoneInput}
                  value={phoneInput}
                  onChangeText={setPhoneInput}
                  placeholder="+39 333 123 4567"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  keyboardType="phone-pad"
                  autoFocus
                />
                <TouchableOpacity
                  style={styles.phoneSaveBtn}
                  onPress={handleSavePhone}
                  disabled={phoneSaving}
                >
                  <Text style={styles.phoneSaveBtnText}>{phoneSaving ? '...' : 'Salva'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.phoneCancelBtn}
                  onPress={() => { setIsEditing(false); setPhoneInput(currentUser?.phone || ''); }}
                >
                  <Text style={styles.phoneCancelBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.phoneDisplayRow} onPress={() => setIsEditing(true)}>
                <Text style={styles.phoneValue}>
                  {phoneInput || 'Nessun numero impostato'}
                </Text>
                <Text style={styles.phoneEditHint}>✏️ Modifica</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.phoneNote}>Riceverai un SMS di promemoria il giorno prima dell'appuntamento.</Text>
          </View>
        </View>

        {/* Info App */}
        <TouchableOpacity style={styles.infoAppBtn} onPress={() => setShowInfo(true)}>
          <Text style={{ fontSize: 20 }}>ℹ️</Text>
          <Text style={styles.infoAppText}>Informazioni App</Text>
          <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 20, marginLeft: 'auto' }}>›</Text>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>🚪 Esci dall'App</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Modale Info App */}
      <Modal visible={showInfo} transparent animationType="slide" onRequestClose={() => setShowInfo(false)}>
        <View style={styles.infoOverlay}>
          <View style={styles.infoModal}>
            <LinearGradient colors={['#1A1A1A', '#111']} style={styles.infoModalGrad}>
              <View style={styles.infoModalHeader}>
                <View style={styles.infoModalIcon}>
                  <Text style={{ fontSize: 32 }}>✂</Text>
                </View>
                <Text style={styles.infoModalTitle}>The Hair Studio</Text>
                <Text style={styles.infoModalVersion}>Versione 1.0.0</Text>
              </View>

              <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>Il Salone</Text>
                <Text style={styles.infoSectionText}>
                  The Hair Studio è il salone di fiducia di Noci (BA), nel cuore della Puglia.
                  Specializzati in taglio, barba e styling, i nostri maestri barbieri garantiscono
                  un'esperienza unica di cura e professionalità.
                </Text>
              </View>

              <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>Contatti</Text>
                <View style={styles.infoRow2}>
                  <Text style={{ fontSize: 14 }}>📍</Text>
                  <Text style={styles.infoRowText}>Via Alessandro Manzoni, 38 — Noci (BA)</Text>
                </View>
                <View style={styles.infoRow2}>
                  <Text style={{ fontSize: 14 }}>📞</Text>
                  <Text style={styles.infoRowText}>+39 328 594 4459</Text>
                </View>
                <View style={styles.infoRow2}>
                  <Text style={{ fontSize: 14 }}>📧</Text>
                  <Text style={styles.infoRowText}>thehair.studio@gmail.com</Text>
                </View>
                <View style={styles.infoRow2}>
                  <Text style={{ fontSize: 14 }}>📸</Text>
                  <Text style={styles.infoRowText}>@thehairstudio_noci</Text>
                </View>
              </View>

              <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>Orari</Text>
                <Text style={styles.infoSectionText}>Mar – Ven: 8:30–13:00 / 15:00–21:00</Text>
                <Text style={styles.infoSectionText}>Sabato: 8:30–20:30</Text>
                <Text style={[styles.infoSectionText, { color: 'rgba(255,255,255,0.35)' }]}>Lunedì e Domenica: Chiuso</Text>
              </View>

              <Text style={styles.infoCopyright}>© 2025 The Hair Studio — Noci, Puglia</Text>

              <TouchableOpacity style={styles.infoCloseBtn} onPress={() => setShowInfo(false)}>
                <Text style={styles.infoCloseBtnText}>Chiudi</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </Modal>
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
  userName: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  userEmail: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4 },
  logoutHeaderBtn: {
    marginTop: 14, paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(231,76,60,0.4)',
    backgroundColor: 'rgba(231,76,60,0.1)',
  },
  logoutHeaderText: { color: '#e74c3c', fontWeight: '700', fontSize: 13 },
  personalStats: {
    flexDirection: 'row', marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14, padding: 14, width: '100%',
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.15)',
  },
  pStatItem: { flex: 1, alignItems: 'center' },
  pStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  pStatValue: { color: '#C9A84C', fontWeight: '900', fontSize: 18 },
  pStatLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 2 },

  content: { flex: 1 },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginBottom: 14 },

  emptyState: { alignItems: 'center', paddingVertical: 30 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: 'rgba(255,255,255,0.5)', fontSize: 15 },
  emptyBtn: {
    marginTop: 16, backgroundColor: 'rgba(201,168,76,0.15)',
    borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10,
    borderWidth: 1, borderColor: '#C9A84C',
  },
  emptyBtnText: { color: '#C9A84C', fontWeight: '700' },

  bookingCard: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  bookingCardCancelled: { opacity: 0.45 },
  bookingLeft: { flex: 1 },
  bookingService: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  bookingDate: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 },
  bookingBarber: { color: '#C9A84C', fontSize: 11, marginTop: 2 },
  bookingRight: { alignItems: 'flex-end', gap: 6 },
  bookingPrice: { color: '#C9A84C', fontWeight: '900', fontSize: 16 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusConfirmed: { backgroundColor: 'rgba(46,204,113,0.15)' },
  statusCancelled: { backgroundColor: 'rgba(231,76,60,0.15)' },
  statusText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  cancelBtn: {
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(231,76,60,0.4)',
    backgroundColor: 'rgba(231,76,60,0.08)',
  },
  cancelBtnText: { color: '#e74c3c', fontSize: 11, fontWeight: '700' },

  periodicCard: { borderRadius: 14, overflow: 'hidden', marginBottom: 10, borderWidth: 1, borderColor: 'rgba(201,168,76,0.25)' },
  periodicGrad: { padding: 16 },
  periodicTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  periodicPeriod: { color: '#C9A84C', fontWeight: '800', fontSize: 15 },
  activeBadge: {
    backgroundColor: 'rgba(46,204,113,0.2)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(46,204,113,0.4)',
  },
  activeBadgeText: { color: '#2ecc71', fontWeight: '800', fontSize: 10 },
  periodicDetail: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  periodicTime: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 },

  salonCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.15)', overflow: 'hidden',
  },
  salonLogoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  salonLogoMini: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(201,168,76,0.15)', borderWidth: 1.5, borderColor: '#C9A84C',
    alignItems: 'center', justifyContent: 'center',
  },
  salonLogoIcon: { fontSize: 24, color: '#C9A84C' },
  salonName: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  salonRating: { color: '#C9A84C', fontSize: 11, marginTop: 2 },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, paddingTop: 12, paddingBottom: 12,
  },
  infoIcon: { fontSize: 20 },
  infoText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, flex: 1 },
  infoArrow: { color: '#C9A84C', fontSize: 20 },

  phoneCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: 'rgba(201,168,76,0.15)',
  },
  phoneLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 10 },
  phoneDisplayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  phoneValue: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  phoneEditHint: { color: '#C9A84C', fontSize: 12 },
  phoneEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  phoneInput: {
    flex: 1, color: '#FFFFFF', fontSize: 15,
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)',
  },
  phoneSaveBtn: {
    backgroundColor: '#C9A84C', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  phoneSaveBtnText: { color: '#0A0A0A', fontWeight: '800', fontSize: 13 },
  phoneCancelBtn: {
    backgroundColor: 'rgba(231,76,60,0.15)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(231,76,60,0.3)',
  },
  phoneCancelBtnText: { color: '#e74c3c', fontWeight: '700' },
  phoneNote: { color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 10, lineHeight: 16 },

  infoAppBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    margin: 20, marginBottom: 0,
    backgroundColor: 'rgba(201,168,76,0.06)', borderRadius: 14,
    padding: 16,
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)',
  },
  infoAppText: { color: '#C9A84C', fontWeight: '700', fontSize: 15 },

  logoutBtn: {
    margin: 20, marginTop: 12,
    backgroundColor: 'rgba(231,76,60,0.1)', borderRadius: 14,
    padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(231,76,60,0.3)',
  },
  logoutText: { color: '#e74c3c', fontWeight: '700', fontSize: 15 },

  infoOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  infoModal: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.25)',
  },
  infoModalGrad: { padding: 28 },
  infoModalHeader: { alignItems: 'center', marginBottom: 24 },
  infoModalIcon: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderWidth: 2, borderColor: '#C9A84C',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  infoModalTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  infoModalVersion: { color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 4 },

  infoSection: { marginBottom: 20 },
  infoSectionTitle: { color: '#C9A84C', fontWeight: '800', fontSize: 13, letterSpacing: 1, marginBottom: 8 },
  infoSectionText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 20 },
  infoRow2: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  infoRowText: { color: 'rgba(255,255,255,0.65)', fontSize: 13 },

  infoCopyright: {
    color: 'rgba(255,255,255,0.2)', fontSize: 11, textAlign: 'center', marginBottom: 20,
  },
  calendarBtn: {
    marginTop: 8, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(66,133,244,0.12)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(66,133,244,0.35)',
    alignSelf: 'flex-start',
  },
  calendarBtnText: { color: '#4285F4', fontSize: 12, fontWeight: '700' },

  infoCloseBtn: {
    backgroundColor: 'rgba(201,168,76,0.15)', borderRadius: 14, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)',
  },
  infoCloseBtnText: { color: '#C9A84C', fontWeight: '700', fontSize: 15 },
});
