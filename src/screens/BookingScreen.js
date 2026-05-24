import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, ActivityIndicator, Dimensions, StatusBar, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { SERVICES, BARBERS, BARBER_PHOTOS } from '../data/appData';

const { width } = Dimensions.get('window');

// Slot da 30 minuti — mattina 08:30-12:30, pomeriggio 15:00-20:30
const TIMES = [
  '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '15:00', '15:30', '16:00', '16:30', '17:00',
  '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
];

const DAYS_IT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const MONTHS_IT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

function formatDateStr(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function generateDates(count = 20) {
  const dates = [];
  const now = new Date();
  for (let i = 1; i <= count + 10; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    if (d.getDay() !== 0 && d.getDay() !== 1) {
      dates.push(d);
      if (dates.length >= count) break;
    }
  }
  return dates;
}

function getBookedTimes(bookings, barberName, dateStr, selectedService) {
  const barberBookings = bookings.filter(b =>
    b.barber === barberName && b.date === dateStr && b.status !== 'cancelled'
  );
  const blocked = new Set();
  barberBookings.forEach(b => {
    const svc = SERVICES.find(s => s.name === b.service);
    const slots = svc ? (svc.slots || 1) : 1;
    const idx = TIMES.indexOf(b.time);
    if (idx >= 0) {
      for (let i = 0; i < slots; i++) {
        if (TIMES[idx + i]) blocked.add(TIMES[idx + i]);
      }
    }
  });
  if (selectedService) {
    const newSlots = selectedService.slots || 1;
    TIMES.forEach((t, idx) => {
      for (let i = 1; i < newSlots; i++) {
        if (!TIMES[idx + i]) blocked.add(t);
      }
    });
    // 12:30 è l'ultimo slot mattutino: un servizio da 2 slot partirebbe da 12:30→15:00 (pausa pranzo)
    if (newSlots > 1) blocked.add('12:30');
  }
  return blocked;
}

// Step order: Barbiere → Servizio → Data → Orario → Conferma
const STEPS = ['Barbiere', 'Servizio', 'Data', 'Orario', 'Conferma'];

export default function BookingScreen({ route, navigation }) {
  const { addBooking, updateBooking, currentUser, bookings, barbers } = useApp();
  const preselected = route?.params?.selectedService || null;

  const [step, setStep] = useState(0);
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [selectedService, setSelectedService] = useState(preselected);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const dates = generateDates(20);

  const bookedTimes = getBookedTimes(
    bookings,
    selectedBarber?.name || '',
    selectedDate ? formatDateStr(selectedDate) : '',
    selectedService
  );

  const handleConfirm = async () => {
    setConfirming(true);
    const booking = {
      clientName: currentUser?.name || 'Ospite',
      clientId:   currentUser?.id   || null,
      service:    selectedService?.name,
      date:       formatDateStr(selectedDate),
      time:       selectedTime,
      barber:     selectedBarber?.name,
      price:      selectedService?.price,
      slots:      selectedService?.slots || 1,
    };
    const newBooking = await addBooking(booking);
    if (newBooking?.id) {
      updateBooking(newBooking.id, { status: 'pending' });
    }
    setConfirming(false);
    setShowModal(true);
  };

  const canProceed = () => {
    if (step === 0) return !!selectedBarber;
    if (step === 1) return !!selectedService;
    if (step === 2) return !!selectedDate;
    if (step === 3) return !!selectedTime;
    return true;
  };

  // Use real barbers from context (with vacation status), fallback to static
  const availableBarbers = barbers.length > 0 ? barbers : BARBERS;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={['#0A0A0A', '#141414']} style={styles.header}>
        <TouchableOpacity
          onPress={() => step > 0 ? setStep(s => s - 1) : navigation.navigate('Home')}
          style={styles.backBtn}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prenota</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Steps indicator */}
      <View style={styles.stepsContainer}>
        {STEPS.map((s, i) => (
          <React.Fragment key={i}>
            <View style={styles.stepItem}>
              <View style={[styles.stepDot, i <= step && styles.stepDotActive, i < step && styles.stepDotDone]}>
                {i < step
                  ? <Text style={styles.stepCheck}>✓</Text>
                  : <Text style={[styles.stepNum, i === step && styles.stepNumActive]}>{i + 1}</Text>}
              </View>
              {i === step && <Text style={styles.stepLabel}>{s}</Text>}
            </View>
            {i < STEPS.length - 1 && (
              <View style={[styles.stepLine, i < step && styles.stepLineActive]} />
            )}
          </React.Fragment>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {/* Step 0: Scegli Barbiere (foto grandi) */}
        {step === 0 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Scegli il Barbiere</Text>
            <Text style={styles.stepSubtitle}>Seleziona il tuo barbiere di fiducia</Text>
            {availableBarbers.map(barber => {
              const photoSource = barber.photoOverride
                ? { uri: barber.photoOverride }
                : BARBER_PHOTOS[barber.id];
              const isSelected = selectedBarber?.id === barber.id;
              const isOnVacation = barber.onVacation;
              return (
                <TouchableOpacity
                  key={barber.id}
                  style={[styles.barberBigCard, isSelected && styles.barberBigCardActive, isOnVacation && styles.barberBigCardVacation]}
                  onPress={() => !isOnVacation && setSelectedBarber(barber)}
                  disabled={isOnVacation}
                >
                  <Image
                    source={photoSource}
                    style={[styles.barberBigPhoto, isOnVacation && { opacity: 0.4 }]}
                    resizeMode="cover"
                  />
                  <View style={styles.barberBigInfo}>
                    <View style={styles.barberBigNameRow}>
                      <Text style={styles.barberBigName}>{barber.name}</Text>
                      {isOnVacation && (
                        <View style={styles.vacationPill}>
                          <Text style={styles.vacationPillText}>🏖️ In Ferie</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.barberBigRole}>{barber.role}</Text>
                    <Text style={styles.barberBigSpec}>{barber.speciality}</Text>
                  </View>
                  {isSelected && (
                    <View style={styles.selectedCheck}>
                      <Text style={styles.checkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Step 1: Scegli Servizio */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Scegli il Servizio</Text>
            {selectedBarber && (
              <View style={styles.selectedBarberBadge}>
                <Text style={styles.selectedBarberBadgeText}>✂ {selectedBarber.name}</Text>
              </View>
            )}
            {SERVICES.map(service => (
              <TouchableOpacity
                key={service.id}
                style={[styles.optionCard, selectedService?.id === service.id && styles.optionCardActive]}
                onPress={() => setSelectedService(service)}
              >
                <View style={styles.optionIconWrap}>
                  {service.emoji2 ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                      <Text style={{ fontSize: 18 }}>{service.emoji}</Text>
                      <Text style={{ fontSize: 18 }}>{service.emoji2}</Text>
                    </View>
                  ) : (
                    <Text style={{ fontSize: 22 }}>{service.emoji}</Text>
                  )}
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionName}>{service.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>⏱</Text>
                    <Text style={styles.optionDetail}>{service.duration} min</Text>
                  </View>
                </View>
                <Text style={styles.optionPrice}>€{service.price}</Text>
                {selectedService?.id === service.id && (
                  <View style={styles.selectedCheck}><Text style={styles.checkText}>✓</Text></View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Step 2: Scegli Data */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Scegli la Data</Text>
            <View style={styles.dateGrid}>
              {dates.map((date, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.dateCard, selectedDate?.toDateString() === date.toDateString() && styles.dateCardActive]}
                  onPress={() => { setSelectedDate(date); setSelectedTime(null); }}
                >
                  <Text style={[styles.dateDay, selectedDate?.toDateString() === date.toDateString() && styles.dateDayActive]}>
                    {DAYS_IT[date.getDay()]}
                  </Text>
                  <Text style={[styles.dateNum, selectedDate?.toDateString() === date.toDateString() && styles.dateNumActive]}>
                    {date.getDate()}
                  </Text>
                  <Text style={[styles.dateMonth, selectedDate?.toDateString() === date.toDateString() && styles.dateMonthActive]}>
                    {MONTHS_IT[date.getMonth()]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 3: Scegli Orario */}
        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Scegli l'Orario</Text>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: 'rgba(201,168,76,0.5)' }]} />
                <Text style={styles.legendText}>Disponibile</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: 'rgba(231,76,60,0.5)' }]} />
                <Text style={styles.legendText}>Non disponibile</Text>
              </View>
            </View>
            <View style={styles.timesGrid}>
              {TIMES.map((time, i) => {
                const isBooked = bookedTimes.has(time);
                const isSelected = selectedTime === time;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.timeChip, isSelected && styles.timeChipActive, isBooked && styles.timeChipBooked]}
                    onPress={() => !isBooked && setSelectedTime(time)}
                    disabled={isBooked}
                  >
                    <Text style={[styles.timeText, isSelected && styles.timeTextActive, isBooked && styles.timeTextBooked]}>
                      {time}
                    </Text>
                    {isBooked && <Text style={styles.timeBookedLabel}>Occ.</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Step 4: Conferma */}
        {step === 4 && selectedService && selectedBarber && selectedDate && selectedTime && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Riepilogo Prenotazione</Text>
            <View style={styles.summaryCard}>
              <LinearGradient colors={['rgba(201,168,76,0.1)', 'rgba(201,168,76,0.05)']} style={styles.summaryGrad}>
                <View style={styles.summaryBarberRow}>
                  <Image
                    source={selectedBarber.photoOverride ? { uri: selectedBarber.photoOverride } : BARBER_PHOTOS[selectedBarber.id]}
                    style={styles.summaryBarberPhoto}
                    resizeMode="cover"
                  />
                  <View>
                    <Text style={styles.summaryBarberName}>{selectedBarber.name}</Text>
                    <Text style={styles.summaryBarberRole}>{selectedBarber.role}</Text>
                  </View>
                </View>
                <View style={styles.summaryDivider} />
                {[
                  { label: 'Servizio', value: selectedService.name },
                  { label: 'Data', value: `${DAYS_IT[selectedDate.getDay()]} ${selectedDate.getDate()} ${MONTHS_IT[selectedDate.getMonth()]}` },
                  { label: 'Orario', value: selectedTime },
                  { label: 'Durata', value: `${selectedService.duration} min` },
                ].map((row, i) => (
                  <React.Fragment key={i}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>{row.label}</Text>
                      <Text style={styles.summaryValue}>{row.value}</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                  </React.Fragment>
                ))}
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { fontSize: 16, fontWeight: '800' }]}>Totale</Text>
                  <Text style={styles.totalPrice}>€{selectedService.price}</Text>
                </View>
              </LinearGradient>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.navButtons}>
        {step > 0 && (
          <TouchableOpacity style={styles.prevBtn} onPress={() => setStep(s => s - 1)}>
            <Text style={styles.prevBtnText}>‹ Indietro</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextBtn, (!canProceed() || confirming) && styles.nextBtnDisabled]}
          onPress={() => step === 4 ? handleConfirm() : setStep(s => s + 1)}
          disabled={!canProceed() || confirming}
        >
          <LinearGradient
            colors={canProceed() ? ['#C9A84C', '#A87C30'] : ['#333', '#333']}
            style={styles.nextGrad}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            {confirming
              ? <ActivityIndicator color="#000" />
              : <Text style={[styles.nextBtnText, !canProceed() && { color: '#666' }]}>
                  {step === 4 ? '✅ Conferma Prenotazione' : 'Avanti ›'}
                </Text>
            }
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Modal conferma prenotazione */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <LinearGradient colors={['#0D1F0D', '#111']} style={styles.modalGrad}>

              {/* Intestazione verde successo */}
              <LinearGradient colors={['rgba(46,204,113,0.25)', 'rgba(46,204,113,0.08)']} style={styles.modalSuccessHeader}>
                <View style={styles.modalSuccessCircle}>
                  <Text style={styles.modalSuccessIcon}>✓</Text>
                </View>
                <Text style={styles.modalTitle}>Prenotazione Confermata!</Text>
                <Text style={styles.modalSubtitle}>Ti aspettiamo al salone 💈</Text>
              </LinearGradient>

              {/* Riepilogo barbiere */}
              <View style={styles.modalBarberRow}>
                <Image
                  source={selectedBarber ? (selectedBarber.photoOverride ? { uri: selectedBarber.photoOverride } : BARBER_PHOTOS[selectedBarber.id]) : BARBER_PHOTOS['1']}
                  style={styles.modalBarberPhoto}
                  resizeMode="cover"
                />
                <View>
                  <Text style={styles.modalBarberName}>{selectedBarber?.name}</Text>
                  <Text style={styles.modalBarberRole}>{selectedBarber?.role}</Text>
                </View>
              </View>

              <View style={styles.modalDivider} />

              {/* Dettagli prenotazione */}
              {[
                { icon: '✂️', label: 'Servizio',  value: selectedService?.name },
                { icon: '📅', label: 'Data',      value: selectedDate ? `${DAYS_IT[selectedDate.getDay()]} ${selectedDate.getDate()} ${MONTHS_IT[selectedDate.getMonth()]}` : '' },
                { icon: '🕐', label: 'Orario',    value: selectedTime },
                { icon: '⏱',  label: 'Durata',    value: `${selectedService?.duration} min` },
              ].map((row, i) => (
                <View key={i} style={styles.modalRow}>
                  <Text style={styles.modalRowIcon}>{row.icon}</Text>
                  <Text style={styles.modalLabel}>{row.label}</Text>
                  <Text style={styles.modalValue}>{row.value}</Text>
                </View>
              ))}

              <LinearGradient colors={['rgba(201,168,76,0.15)', 'rgba(201,168,76,0.05)']} style={styles.modalTotalRow}>
                <Text style={styles.modalTotalLabel}>Totale da pagare</Text>
                <Text style={styles.modalTotalValue}>€{selectedService?.price}</Text>
              </LinearGradient>

              {currentUser?.email && (
                <Text style={styles.modalEmailNote}>📧 Riepilogo inviato a {currentUser.email}</Text>
              )}

              {/* CTA buttons */}
              <TouchableOpacity
                style={styles.modalBtnPrimary}
                onPress={() => { setShowModal(false); navigation.navigate('Profile'); }}
              >
                <LinearGradient colors={['#C9A84C', '#A87C30']} style={styles.modalBtnGrad}>
                  <Text style={styles.modalBtnText}>Vedi le mie prenotazioni →</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalBtnSecondary}
                onPress={() => { setShowModal(false); navigation.navigate('Home'); }}
              >
                <Text style={styles.modalBtnSecondaryText}>Torna alla Home</Text>
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
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: '#C9A84C', fontSize: 32 },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },

  stepsContainer: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 16, backgroundColor: '#0A0A0A',
  },
  stepItem: { alignItems: 'center' },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  stepDotActive: { backgroundColor: 'rgba(201,168,76,0.2)', borderColor: '#C9A84C' },
  stepDotDone: { backgroundColor: '#C9A84C', borderColor: '#C9A84C' },
  stepNum: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700' },
  stepNumActive: { color: '#C9A84C' },
  stepCheck: { color: '#000000', fontSize: 12, fontWeight: '900' },
  stepLabel: { color: '#C9A84C', fontSize: 9, marginTop: 4, fontWeight: '600' },
  stepLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 4, marginBottom: 14 },
  stepLineActive: { backgroundColor: '#C9A84C' },

  content: { flex: 1 },
  stepContent: { padding: 20 },
  stepTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginBottom: 6 },
  stepSubtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 20 },

  // Barber big cards (Step 0)
  barberBigCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16,
    padding: 16, marginBottom: 12,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  barberBigCardActive: { borderColor: '#C9A84C', backgroundColor: 'rgba(201,168,76,0.08)' },
  barberBigCardVacation: { opacity: 0.5 },
  barberBigPhoto: {
    width: 80, height: 80, borderRadius: 40, marginRight: 16,
    borderWidth: 2, borderColor: 'rgba(201,168,76,0.4)',
  },
  barberBigInfo: { flex: 1 },
  barberBigNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  barberBigName: { color: '#FFFFFF', fontWeight: '800', fontSize: 18 },
  barberBigRole: { color: '#C9A84C', fontSize: 13, fontWeight: '600' },
  barberBigSpec: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4 },
  vacationPill: {
    backgroundColor: 'rgba(231,76,60,0.2)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: 'rgba(231,76,60,0.4)',
  },
  vacationPillText: { color: '#e74c3c', fontSize: 10, fontWeight: '700' },

  selectedBarberBadge: {
    backgroundColor: 'rgba(201,168,76,0.1)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)',
    marginBottom: 16, alignSelf: 'flex-start',
  },
  selectedBarberBadgeText: { color: '#C9A84C', fontWeight: '700', fontSize: 13 },

  // Service cards (Step 1)
  optionCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14,
    padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  optionCardActive: { borderColor: '#C9A84C', backgroundColor: 'rgba(201,168,76,0.08)' },
  optionIconWrap: {
    width: 42, height: 42, borderRadius: 10,
    backgroundColor: 'rgba(201,168,76,0.1)',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  optionInfo: { flex: 1 },
  optionName: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  optionDetail: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
  optionPrice: { color: '#C9A84C', fontWeight: '800', fontSize: 18 },
  selectedCheck: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#C9A84C', alignItems: 'center', justifyContent: 'center', marginLeft: 10,
  },
  checkText: { color: '#000000', fontWeight: '900', fontSize: 12 },

  // Date grid (Step 2)
  dateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dateCard: {
    width: (width - 60) / 4, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, paddingVertical: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  dateCardActive: { backgroundColor: 'rgba(201,168,76,0.15)', borderColor: '#C9A84C' },
  dateDay: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600' },
  dateDayActive: { color: '#C9A84C' },
  dateNum: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', marginVertical: 2 },
  dateNumActive: { color: '#C9A84C' },
  dateMonth: { color: 'rgba(255,255,255,0.4)', fontSize: 10 },
  dateMonthActive: { color: '#C9A84C' },

  // Times (Step 3)
  legendRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
  timesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeChip: {
    paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', minWidth: 72,
  },
  timeChipActive: { backgroundColor: 'rgba(201,168,76,0.15)', borderColor: '#C9A84C' },
  timeChipBooked: { backgroundColor: 'rgba(231,76,60,0.08)', borderColor: 'rgba(231,76,60,0.2)', opacity: 0.6 },
  timeText: { color: 'rgba(255,255,255,0.7)', fontWeight: '600', fontSize: 14 },
  timeTextActive: { color: '#C9A84C' },
  timeTextBooked: { color: 'rgba(231,76,60,0.6)', fontSize: 12 },
  timeBookedLabel: { color: 'rgba(231,76,60,0.5)', fontSize: 9, marginTop: 2 },

  // Summary (Step 4)
  summaryCard: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)' },
  summaryGrad: { padding: 20 },
  summaryBarberRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  summaryBarberPhoto: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: '#C9A84C' },
  summaryBarberName: { color: '#FFFFFF', fontWeight: '800', fontSize: 18 },
  summaryBarberRole: { color: '#C9A84C', fontSize: 12, marginTop: 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  summaryLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  summaryValue: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  summaryDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  totalPrice: { color: '#C9A84C', fontWeight: '900', fontSize: 24 },

  navButtons: {
    flexDirection: 'row', gap: 12, padding: 20,
    backgroundColor: '#0A0A0A',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
  },
  prevBtn: {
    flex: 1, paddingVertical: 16, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  prevBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
  nextBtn: { flex: 2, borderRadius: 14, overflow: 'hidden' },
  nextBtnDisabled: { opacity: 0.5 },
  nextGrad: { paddingVertical: 16, alignItems: 'center' },
  nextBtnText: { color: '#000000', fontWeight: '800', fontSize: 16 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  modalCard: {
    width: '100%', maxWidth: 400, borderRadius: 24, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(46,204,113,0.3)',
  },
  modalGrad: { paddingBottom: 24 },
  modalSuccessHeader: {
    alignItems: 'center', paddingTop: 28, paddingBottom: 22, paddingHorizontal: 24,
    borderBottomWidth: 1, borderBottomColor: 'rgba(46,204,113,0.15)',
  },
  modalSuccessCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(46,204,113,0.2)',
    borderWidth: 2.5, borderColor: '#2ecc71',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  modalSuccessIcon: { color: '#2ecc71', fontSize: 36, fontWeight: '900' },
  modalTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', textAlign: 'center' },
  modalSubtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4 },
  modalBarberRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 24, paddingTop: 18, paddingBottom: 14,
  },
  modalBarberPhoto: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#C9A84C' },
  modalBarberName: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  modalBarberRole: { color: '#C9A84C', fontSize: 12, marginTop: 2 },
  modalDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 24, marginBottom: 4 },
  modalRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
    gap: 10,
  },
  modalRowIcon: { fontSize: 16, width: 24 },
  modalLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 13, flex: 1 },
  modalValue: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  modalTotalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: 24, marginTop: 14, borderRadius: 12, padding: 14,
  },
  modalTotalLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },
  modalTotalValue: { color: '#C9A84C', fontWeight: '900', fontSize: 26 },
  modalEmailNote: {
    color: 'rgba(201,168,76,0.6)', fontSize: 11, textAlign: 'center',
    marginTop: 12, marginHorizontal: 24,
  },
  modalBtnPrimary: { marginHorizontal: 24, marginTop: 16, borderRadius: 14, overflow: 'hidden' },
  modalBtnGrad: { paddingVertical: 15, alignItems: 'center' },
  modalBtnText: { color: '#000000', fontWeight: '900', fontSize: 15 },
  modalBtnSecondary: { marginHorizontal: 24, marginTop: 10, paddingVertical: 12, alignItems: 'center' },
  modalBtnSecondaryText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
});
