import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Dimensions, Image, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { SERVICES, BARBERS, BARBER_PHOTOS, PERIODIC_OPTIONS } from '../data/appData';

const { width } = Dimensions.get('window');
const DAYS_IT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

function generateNextDates(intervalDays, count = 6) {
  const dates = [];
  const now = new Date();
  let current = new Date(now);
  current.setDate(now.getDate() + 3);
  // Find the first valid day (not Mon=1, not Sun=0)
  let safetyCounter = 0;
  while (current.getDay() === 0 || current.getDay() === 1) {
    current.setDate(current.getDate() + 1);
    if (++safetyCounter > 7) break;
  }
  while (dates.length < count) {
    dates.push(new Date(current));
    let next = new Date(current);
    next.setDate(next.getDate() + intervalDays);
    safetyCounter = 0;
    while (next.getDay() === 0 || next.getDay() === 1) {
      next.setDate(next.getDate() + 1);
      if (++safetyCounter > 7) break;
    }
    current = next;
  }
  return dates;
}

export default function PeriodicBookingScreen({ navigation }) {
  const { addPeriodicBooking, periodicBookings, currentUser, barbers, hasActivePeriodic } = useApp();
  const availableBarbers = barbers.length > 0 ? barbers : BARBERS;
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const activePeriodic = currentUser?.id ? hasActivePeriodic(currentUser.id) : null;

  const TIMES = [
    '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '15:00', '15:30', '16:00', '16:30', '17:00',
    '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
  ];

  const previewDates = selectedPeriod
    ? generateNextDates(selectedPeriod.intervalDays)
    : [];

  const handleConfirm = async () => {
    if (submitting) return;
    if (!selectedPeriod || !selectedService || !selectedBarber) return;
    setSubmitting(true);
    const periodic = {
      clientName: currentUser?.name || 'Ospite',
      clientId:   currentUser?.id   || null,
      periodType: selectedPeriod.id,
      periodLabel: selectedPeriod.label,
      frequency: selectedPeriod.id,
      service: selectedService.name,
      barber: selectedBarber.name,
      time: selectedTime,
      price: selectedService.price,
      slots: selectedService.slots ?? 1,
    };
    try {
      const res = await addPeriodicBooking(periodic);
      const occurrences = res?.count || previewDates.length;
      const msg = `${selectedPeriod.label} con ${selectedBarber.name}\nServizio: ${selectedService.name} — €${selectedService.price}\n\nGenerate ${occurrences} occorrenze per i prossimi 12 mesi.\nVincolo annuale: per fare altri tipi di prenotazioni devi prima disattivare l'abbonamento dal Profilo.`;
      if (Platform.OS === 'web') {
        window.alert('🔄 Prenotazione Periodica Attivata!\n\n' + msg);
        navigation.navigate('Home');
      } else {
        Alert.alert(
          '🔄 Prenotazione Periodica Attivata!',
          msg,
          [{ text: 'Fantastico! 🎉', onPress: () => navigation.navigate('Home') }]
        );
      }
    } catch (e) {
      const detail = e?.message || 'errore sconosciuto';
      if (Platform.OS === 'web') {
        window.alert(`⚠️ Impossibile attivare la periodica\n\n${detail}`);
      } else {
        Alert.alert('Errore', detail);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // BLOCCO: se ne ha già una attiva, mostra solo il riepilogo + invito a disattivarla
  if (activePeriodic) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0A0A0A', '#141414']} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.backBtn}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Prenotazione Periodica</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 32 }}>
          <View style={stylesBlock.card}>
            <LinearGradient colors={['rgba(46,204,113,0.18)', 'rgba(46,204,113,0.05)']} style={stylesBlock.grad}>
              <View style={stylesBlock.iconCircle}>
                <Text style={stylesBlock.icon}>✅</Text>
              </View>
              <Text style={stylesBlock.title}>Abbonamento già Attivo</Text>
              <Text style={stylesBlock.subtitle}>Hai una prenotazione periodica in corso</Text>

              <View style={stylesBlock.box}>
                <Text style={stylesBlock.boxLabel}>Frequenza</Text>
                <Text style={stylesBlock.boxValue}>{activePeriodic.periodLabel}</Text>
              </View>
              <View style={stylesBlock.box}>
                <Text style={stylesBlock.boxLabel}>Servizio</Text>
                <Text style={stylesBlock.boxValue}>{activePeriodic.service}</Text>
              </View>
              <View style={stylesBlock.box}>
                <Text style={stylesBlock.boxLabel}>Barbiere</Text>
                <Text style={stylesBlock.boxValue}>{activePeriodic.barber}</Text>
              </View>
              <View style={stylesBlock.box}>
                <Text style={stylesBlock.boxLabel}>Orario fisso</Text>
                <Text style={stylesBlock.boxValue}>🕐 {activePeriodic.time}</Text>
              </View>

              <View style={stylesBlock.warn}>
                <Text style={stylesBlock.warnIcon}>ℹ️</Text>
                <Text style={stylesBlock.warnText}>
                  Puoi avere <Text style={{ fontWeight: '900', color: '#C9A84C' }}>una sola periodica attiva alla volta</Text>. Vincolo annuale. Per cambiarla o annullarla vai sul tuo Profilo.
                </Text>
              </View>

              <TouchableOpacity
                style={stylesBlock.btnPrimary}
                onPress={() => navigation.navigate('Profile')}
              >
                <LinearGradient colors={['#C9A84C', '#A87C30']} style={stylesBlock.btnGrad}>
                  <Text style={stylesBlock.btnText}>Vai al Profilo →</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={stylesBlock.btnSecondary}
                onPress={() => navigation.navigate('Home')}
              >
                <Text style={stylesBlock.btnSecondaryText}>Torna alla Home</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#0A0A0A', '#141414']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prenotazione Periodica</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>

        {/* Info Banner */}
        <LinearGradient
          colors={['rgba(201,168,76,0.12)', 'rgba(201,168,76,0.05)']}
          style={styles.infoBanner}
        >
          <Text style={styles.bannerIcon}>🔄</Text>
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>Abbonamento Appuntamenti</Text>
            <Text style={styles.bannerSub}>Prenota automaticamente il tuo taglio con cadenza fissa. Prezzi invariati.</Text>
          </View>
        </LinearGradient>

        {/* Avviso vincolo annuale */}
        <View style={styles.lockBanner}>
          <Text style={styles.lockBannerIcon}>⚠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.lockBannerTitle}>Vincolo Annuale Esclusivo</Text>
            <Text style={styles.lockBannerSub}>
              Genera 1 anno di appuntamenti automatici. Finché è attiva non potrai fare altre prenotazioni singole, dovrai prima disattivarla dal Profilo.
            </Text>
          </View>
        </View>

        {/* Step 0: Frequenza */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Scegli la Frequenza</Text>
          {PERIODIC_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.id}
              style={[styles.periodCard, selectedPeriod?.id === opt.id && styles.periodCardActive]}
              onPress={() => setSelectedPeriod(opt)}
            >
              <LinearGradient
                colors={selectedPeriod?.id === opt.id
                  ? ['rgba(201,168,76,0.15)', 'rgba(201,168,76,0.08)']
                  : ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.02)']}
                style={styles.periodGrad}
              >
                <View style={styles.periodLeft}>
                  <View style={styles.periodIconWrap}>
                    <Text style={{ fontSize: 22 }}>{opt.emoji}</Text>
                  </View>
                  <View>
                    <Text style={styles.periodLabel}>{opt.label}</Text>
                    <Text style={styles.periodDesc}>{opt.description}</Text>
                  </View>
                </View>
                {selectedPeriod?.id === opt.id && (
                  <View style={styles.checkBadge}>
                    <Text style={styles.checkText}>✓</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* Step 1: Servizio */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Scegli il Servizio</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {SERVICES.map(service => (
              <TouchableOpacity
                key={service.id}
                style={[styles.serviceChip, selectedService?.id === service.id && styles.serviceChipActive]}
                onPress={() => setSelectedService(service)}
              >
                {service.emoji2 ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 6, gap: 1 }}>
                    <Text style={{ fontSize: 13 }}>{service.emoji}</Text>
                    <Text style={{ fontSize: 13 }}>{service.emoji2}</Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: 16, marginRight: 6 }}>{service.emoji}</Text>
                )}
                <Text style={[styles.serviceChipText, selectedService?.id === service.id && styles.serviceChipTextActive]}>
                  {service.name}
                </Text>
                <Text style={[styles.serviceChipPrice, selectedService?.id === service.id && { color: '#000' }]}>
                  €{service.price}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Step 2: Barbiere con foto */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Scegli il Barbiere</Text>
          <View style={styles.barbersRow}>
            {availableBarbers.map(barber => {
              const photoSource = barber.photoOverride
                ? { uri: barber.photoOverride }
                : BARBER_PHOTOS[barber.id];
              const isSelected = selectedBarber?.id === barber.id;
              const isOnVacation = barber.onVacation;
              return (
                <TouchableOpacity
                  key={barber.id}
                  style={[styles.barberBtn, isSelected && styles.barberBtnActive, isOnVacation && { opacity: 0.4 }]}
                  onPress={() => !isOnVacation && setSelectedBarber(barber)}
                  disabled={isOnVacation}
                >
                  <Image source={photoSource} style={styles.barberBtnPhoto} resizeMode="cover" />
                  <Text style={[styles.barberBtnName, isSelected && styles.barberBtnNameActive]}>
                    {barber.name}
                  </Text>
                  <Text style={styles.barberBtnRole}>{isOnVacation ? '🏖️ Ferie' : barber.role}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Step 3: Orario */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Orario Preferito</Text>
          <View style={styles.timesGrid}>
            {TIMES.map((time, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.timeChip, selectedTime === time && styles.timeChipActive]}
                onPress={() => setSelectedTime(time)}
              >
                <Text style={[styles.timeText, selectedTime === time && styles.timeTextActive]}>{time}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Preview prossimi appuntamenti */}
        {selectedPeriod && previewDates.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 Prossimi Appuntamenti</Text>
            <View style={styles.previewCard}>
              {previewDates.map((date, i) => (
                <View key={i} style={[styles.previewRow, i > 0 && styles.previewRowBorder]}>
                  <View style={styles.previewDateBadge}>
                    <Text style={styles.previewDay}>{DAYS_IT[date.getDay()]}</Text>
                    <Text style={styles.previewDate}>{date.getDate()}/{date.getMonth() + 1}</Text>
                  </View>
                  <Text style={styles.previewTime}>{selectedTime}</Text>
                  {selectedService && (
                    <Text style={styles.previewService}>{selectedService.name}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Prenotazioni attive */}
        {periodicBookings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔄 Abbonamenti Attivi</Text>
            {periodicBookings.map(pb => (
              <View key={pb.id} style={styles.activeBookingCard}>
                <View style={styles.activeBookingLeft}>
                  <Text style={styles.activePeriodLabel}>{pb.periodLabel}</Text>
                  <Text style={styles.activeService}>{pb.serviceIcon} {pb.service} con {pb.barber}</Text>
                  <Text style={styles.activeTime}>🕐 {pb.time}</Text>
                </View>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>ATTIVO</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Confirm Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmBtn,
          (!(selectedPeriod && selectedService && selectedBarber) || submitting) && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={!(selectedPeriod && selectedService && selectedBarber) || submitting}
        >
          <LinearGradient
            colors={(selectedPeriod && selectedService && selectedBarber && !submitting)
              ? ['#C9A84C', '#A87C30'] : ['#333', '#333']}
            style={styles.confirmGrad}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Text style={[styles.confirmText,
            (!(selectedPeriod && selectedService && selectedBarber) || submitting) && { color: '#666' }]}>
              {submitting ? '⏳ Generazione 1 anno...' : '🔄 Attiva Prenotazione Periodica'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: '#C9A84C', fontSize: 32 },
  headerTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  content: { flex: 1 },

  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    margin: 20, padding: 16, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.25)',
  },
  bannerIcon: { fontSize: 36 },
  bannerText: { flex: 1 },
  bannerTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  bannerSub: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },

  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginBottom: 14 },

  periodCard: { borderRadius: 14, overflow: 'hidden', marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  periodCardActive: { borderColor: '#C9A84C' },
  periodGrad: { flexDirection: 'row', alignItems: 'center', padding: 16, justifyContent: 'space-between' },
  periodLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  periodIconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(201,168,76,0.1)', alignItems: 'center', justifyContent: 'center' },
  periodLabel: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  periodDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  discountBadge: {
    backgroundColor: '#C9A84C', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4, marginRight: 8,
  },
  discountText: { color: '#000', fontWeight: '900', fontSize: 13 },
  checkBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#C9A84C', alignItems: 'center', justifyContent: 'center',
  },
  checkText: { color: '#000', fontWeight: '900', fontSize: 13 },

  serviceChip: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12,
    padding: 14, marginRight: 10, alignItems: 'center', minWidth: 110,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  serviceChipActive: { backgroundColor: '#C9A84C', borderColor: '#C9A84C' },
  serviceChipText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  serviceChipTextActive: { color: '#000000' },
  serviceChipPrice: { color: '#C9A84C', fontWeight: '800', fontSize: 14, marginTop: 4 },

  barbersRow: { flexDirection: 'row', gap: 14 },
  barberBtn: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14,
    padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  barberBtnActive: { borderColor: '#C9A84C', backgroundColor: 'rgba(201,168,76,0.1)' },
  barberBtnPhoto: { width: 64, height: 64, borderRadius: 32, marginBottom: 8, borderWidth: 2, borderColor: 'rgba(201,168,76,0.3)' },
  barberBtnName: { color: 'rgba(255,255,255,0.7)', fontWeight: '700', fontSize: 15 },
  barberBtnNameActive: { color: '#C9A84C' },
  barberBtnRole: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 },

  timesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeChip: {
    paddingVertical: 10, paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  timeChipActive: { backgroundColor: 'rgba(201,168,76,0.15)', borderColor: '#C9A84C' },
  timeText: { color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  timeTextActive: { color: '#C9A84C' },

  previewCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)',
    overflow: 'hidden',
  },
  previewRow: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    gap: 14,
  },
  previewRowBorder: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  previewDateBadge: {
    backgroundColor: 'rgba(201,168,76,0.15)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center',
  },
  previewDay: { color: '#C9A84C', fontSize: 10, fontWeight: '600' },
  previewDate: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  previewTime: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  previewService: { color: 'rgba(255,255,255,0.5)', fontSize: 12, flex: 1, textAlign: 'right' },

  activeBookingCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)',
  },
  activeBookingLeft: { flex: 1 },
  activePeriodLabel: { color: '#C9A84C', fontWeight: '800', fontSize: 14 },
  activeService: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 },
  activeTime: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
  activeBadge: {
    backgroundColor: 'rgba(46,204,113,0.2)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(46,204,113,0.4)',
  },
  activeBadgeText: { color: '#2ecc71', fontWeight: '800', fontSize: 11 },

  footer: {
    padding: 20, backgroundColor: '#0A0A0A',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
  },
  confirmBtn: { borderRadius: 14, overflow: 'hidden' },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmGrad: { paddingVertical: 16, alignItems: 'center' },
  confirmText: { color: '#000000', fontWeight: '800', fontSize: 16 },

  lockBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    marginHorizontal: 20, marginBottom: 18,
    padding: 14, borderRadius: 12,
    backgroundColor: 'rgba(243,156,18,0.1)',
    borderWidth: 1, borderColor: 'rgba(243,156,18,0.35)',
  },
  lockBannerIcon: { fontSize: 22 },
  lockBannerTitle: { color: '#f39c12', fontWeight: '900', fontSize: 13, marginBottom: 4 },
  lockBannerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, lineHeight: 16 },
});

const stylesBlock = StyleSheet.create({
  card: { borderRadius: 18, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(46,204,113,0.4)' },
  grad: { padding: 22, alignItems: 'center' },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(46,204,113,0.18)',
    borderWidth: 2, borderColor: '#2ecc71',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  icon: { fontSize: 40 },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: '#2ecc71', fontSize: 12, fontWeight: '700', marginTop: 4, letterSpacing: 1, marginBottom: 20 },
  box: {
    width: '100%', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 14, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(46,204,113,0.15)',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  boxLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600' },
  boxValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  warn: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: 'rgba(201,168,76,0.1)', borderRadius: 12,
    padding: 14, marginTop: 14, marginBottom: 18,
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.35)',
  },
  warnIcon: { fontSize: 22 },
  warnText: { flex: 1, color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 18 },
  btnPrimary: { width: '100%', borderRadius: 14, overflow: 'hidden' },
  btnGrad: { paddingVertical: 15, alignItems: 'center' },
  btnText: { color: '#000000', fontWeight: '900', fontSize: 15 },
  btnSecondary: { marginTop: 10, paddingVertical: 12, alignItems: 'center' },
  btnSecondaryText: { color: 'rgba(255,255,255,0.55)', fontSize: 14 },
});
