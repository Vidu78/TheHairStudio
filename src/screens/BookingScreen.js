import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, ActivityIndicator, Dimensions, StatusBar, Image,
  Alert, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { SERVICES, BARBERS, BARBER_PHOTOS } from '../data/appData';
import { getResidualTimes } from '../utils/calendarUtils';
import { downloadICS } from '../utils/emailService';
import { ensureValidToken } from '../utils/authService';

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

function getSlotAvailability(bookings, barberName, dateStr, selectedService) {
  // Slot REALMENTE occupati da altre prenotazioni di questo barbiere
  const realBooked = new Set();
  const barberBookings = bookings.filter(b =>
    b.barber === barberName && b.date === dateStr && b.status !== 'cancelled'
  );
  barberBookings.forEach(b => {
    const svc = SERVICES.find(s => s.name === b.service);
    const slots = svc ? (svc.slots ?? 1) : (b.slots ?? 1);
    if (slots === 0) return; // booking micro: non occupa slot da 30 min
    const idx = TIMES.indexOf(b.time);
    if (idx >= 0) {
      for (let i = 0; i < slots; i++) {
        if (TIMES[idx + i]) realBooked.add(TIMES[idx + i]);
      }
    }
  });

  // Slot non utilizzabili dal servizio scelto (fine giornata o pausa pranzo)
  const unavailable = new Set();
  if (selectedService) {
    const newSlots = selectedService.slots ?? 1;
    if (newSlots > 0) {
      TIMES.forEach((t, idx) => {
        for (let i = 1; i < newSlots; i++) {
          if (!TIMES[idx + i]) unavailable.add(t);
        }
      });
      // 12:30 è l'ultimo slot mattutino: un servizio multi-slot sforerebbe la pausa pranzo
      if (newSlots > 1) unavailable.add('12:30');
    }
  }

  return { realBooked, unavailable };
}

// Step order: Barbiere → Servizio → Data → Orario → Conferma
const STEPS = ['Barbiere', 'Servizio', 'Data', 'Orario', 'Conferma'];

export default function BookingScreen({ route, navigation }) {
  const { addBooking, currentUser, bookings, barbers, hasActivePeriodic } = useApp();
  const preselected = route?.params?.selectedService || null;

  const activePeriodic = currentUser?.id ? hasActivePeriodic(currentUser.id) : null;

  const [step, setStep] = useState(0);
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [selectedService, setSelectedService] = useState(preselected);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  const dates = generateDates(20);

  const { realBooked, unavailable } = getSlotAvailability(
    bookings,
    selectedBarber?.name || '',
    selectedDate ? formatDateStr(selectedDate) : '',
    selectedService
  );

  // 15-min residui da Taglio+Barba (sempre calcolati se barbiere+data scelti, anche per servizi non micro:
  // sono visibili anche al cliente che ha scelto Taglio, cosi' sa che esistono e puo' scegliere un micro)
  const isMicroService = !!selectedService?.microSlot;
  const residualTimes = (selectedBarber && selectedDate)
    ? Array.from(getResidualTimes(bookings, selectedBarber.name, formatDateStr(selectedDate))).sort()
    : [];
  // Filtro client-side: mostriamo SOLO orari liberi (no rossi/occupati né "N/D")
  const availableTimes = TIMES.filter(t => !realBooked.has(t) && !unavailable.has(t));
  const displayTimes = isMicroService
    ? residualTimes
    : [...availableTimes, ...residualTimes].sort((a, b) => a.localeCompare(b));

  // Mostra un dialog "Sessione scaduta" che rimanda alla Login
  const showSessionExpiredDialog = () => {
    const msg = 'La tua sessione è scaduta per inattività.\nDevi accedere di nuovo prima di prenotare.';
    const goToLogin = () => {
      try { navigation.replace('Login'); } catch (_) {}
    };
    if (Platform.OS === 'web') {
      try { window.alert(`Sessione scaduta\n\n${msg}`); } catch (_) {}
      goToLogin();
    } else {
      Alert.alert('Sessione scaduta', msg, [
        { text: 'Vai al login', onPress: goToLogin },
      ]);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    setConfirmError('');
    const booking = {
      clientName: currentUser?.name || 'Ospite',
      clientId:   currentUser?.id   || null,
      service:    selectedService?.name,
      date:       formatDateStr(selectedDate),
      time:       selectedTime,
      barber:     selectedBarber?.name,
      price:      selectedService?.price,
      slots:      selectedService?.slots ?? 1,
    };
    console.log('[Booking] handleConfirm START', booking);

    // STEP 1: ensureValidToken — se la sessione e' scaduta, rinnova; se non puo', dialog + logout
    try {
      await ensureValidToken();
    } catch (tokenErr) {
      console.warn('[Booking] ensureValidToken fallito:', tokenErr?.message);
      setConfirming(false);
      if (tokenErr?.message === 'NO_SESSION' || tokenErr?.message === 'SESSION_EXPIRED') {
        showSessionExpiredDialog();
        return;
      }
      // Altri errori non bloccanti → si continua, verra' gestito dal try sotto
    }

    // Safety timer: se per qualsiasi motivo addBooking si blocca, dopo 15 sec sblocca tutto
    let resolved = false;
    const safetyTimer = setTimeout(() => {
      if (resolved) return;
      console.warn('[Booking] SAFETY TIMER triggered (15s)');
      setConfirming(false);
      setConfirmError('La prenotazione sta impiegando troppo tempo. Controlla la connessione e riprova.');
    }, 15000);

    try {
      const result = await Promise.race([
        addBooking(booking),
        new Promise((_, reject) => setTimeout(() => reject(new Error('total_timeout')), 12000)),
      ]);
      resolved = true;
      clearTimeout(safetyTimer);
      console.log('[Booking] addBooking OK', result);
      setConfirming(false);
      setShowModal(true);
    } catch (e) {
      resolved = true;
      clearTimeout(safetyTimer);
      setConfirming(false);
      console.error('[Booking] handleConfirm ERROR:', e);
      const detail = e?.message || e?.error_description || JSON.stringify(e) || 'errore sconosciuto';
      // Sessione scaduta arrivata fino a qui (es. INSERT rifiutato per JWT scaduto) → dialog
      if (/jwt|session|expired|unauthorized|401/i.test(detail) || detail === 'SESSION_EXPIRED') {
        showSessionExpiredDialog();
        return;
      }
      let msg;
      if (detail === 'sb_timeout' || detail === 'total_timeout') {
        msg = 'Connessione lenta o assente. Controlla la connessione e riprova tra qualche secondo.';
      } else if (typeof detail === 'string' && detail.startsWith('Hai già una prenotazione')) {
        msg = detail;
      } else {
        msg = `Impossibile salvare la prenotazione.\n\nDettaglio: ${detail}`;
      }
      // Banner inline (sempre visibile, anche se window.alert e' bloccato)
      setConfirmError(msg);
      try {
        if (Platform.OS === 'web') window.alert(`Attenzione\n\n${msg}`);
        else Alert.alert('Attenzione', msg);
      } catch (_) {}
    }
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

  // BLOCCO: se l'utente ha una periodica attiva, non può prenotare singolarmente
  if (activePeriodic) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#0A0A0A', '#141414']} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.backBtn}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Prenota</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.blockScroll}>
          <View style={styles.blockCard}>
            <LinearGradient colors={['rgba(201,168,76,0.18)', 'rgba(201,168,76,0.05)']} style={styles.blockGrad}>
              <View style={styles.blockIconCircle}>
                <Text style={styles.blockIcon}>🔄</Text>
              </View>
              <Text style={styles.blockTitle}>Hai una Prenotazione Periodica Attiva</Text>
              <Text style={styles.blockSubtitle}>Durata annuale · Vincolo esclusivo</Text>

              <View style={styles.blockBox}>
                <Text style={styles.blockBoxLabel}>Abbonamento</Text>
                <Text style={styles.blockBoxValue}>{activePeriodic.periodLabel}</Text>
              </View>
              <View style={styles.blockBox}>
                <Text style={styles.blockBoxLabel}>Servizio</Text>
                <Text style={styles.blockBoxValue}>{activePeriodic.service}</Text>
              </View>
              <View style={styles.blockBox}>
                <Text style={styles.blockBoxLabel}>Barbiere</Text>
                <Text style={styles.blockBoxValue}>{activePeriodic.barber}</Text>
              </View>
              <View style={styles.blockBox}>
                <Text style={styles.blockBoxLabel}>Orario fisso</Text>
                <Text style={styles.blockBoxValue}>🕐 {activePeriodic.time}</Text>
              </View>

              <View style={styles.blockWarn}>
                <Text style={styles.blockWarnIcon}>⚠️</Text>
                <Text style={styles.blockWarnText}>
                  Per prenotare altri servizi devi prima <Text style={{ fontWeight: '900', color: '#C9A84C' }}>disattivare la prenotazione periodica</Text> dal tuo Profilo. La periodica ha durata di 1 anno.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.blockBtnPrimary}
                onPress={() => navigation.navigate('Profile')}
              >
                <LinearGradient colors={['#C9A84C', '#A87C30']} style={styles.blockBtnGrad}>
                  <Text style={styles.blockBtnText}>Vai al Profilo →</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.blockBtnSecondary}
                onPress={() => navigation.navigate('Home')}
              >
                <Text style={styles.blockBtnSecondaryText}>Torna alla Home</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </ScrollView>
      </View>
    );
  }

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
            {isMicroService && (
              <View style={styles.microInfoBox}>
                <Text style={styles.microInfoIcon}>💡</Text>
                <Text style={styles.microInfoText}>
                  Questo servizio da 15 min si prenota nei "ritagli" lasciati liberi dopo un Taglio + Barba (45 min).
                </Text>
              </View>
            )}
            {!isMicroService && (
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: 'rgba(201,168,76,0.5)' }]} />
                  <Text style={styles.legendText}>Disponibile</Text>
                </View>
                {residualTimes.length > 0 && (
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: 'rgba(46,204,113,0.6)' }]} />
                    <Text style={styles.legendText}>Libero 15'</Text>
                  </View>
                )}
              </View>
            )}
            {displayTimes.length === 0 ? (
              <View style={styles.emptyMicroBox}>
                <Text style={styles.emptyMicroIcon}>{isMicroService ? '🪒' : '📅'}</Text>
                <Text style={styles.emptyMicroTitle}>
                  {isMicroService
                    ? 'Nessun residuo disponibile'
                    : 'Nessun servizio disponibile per questa data'}
                </Text>
                <Text style={styles.emptyMicroText}>
                  {isMicroService
                    ? `Al momento ${selectedBarber?.name} non ha un Taglio + Barba prenotato per questo giorno, quindi non ci sono "code" da 15 min libere.`
                    : `Tutti gli orari di ${selectedBarber?.name} per questa data sono già stati prenotati. Prova un'altra data o cambia barbiere.`}
                </Text>
              </View>
            ) : (
              <View style={styles.timesGrid}>
                {displayTimes.map((time, i) => {
                  // Un orario è "residuo" se NON è nel set TIMES (es. 09:45)
                  const isResidual    = !TIMES.includes(time);
                  const isBooked      = !isResidual && realBooked.has(time);
                  const isUnavailable = !isResidual && !isBooked && unavailable.has(time);
                  // I residui sono tappabili solo se l'utente ha scelto un servizio micro.
                  // Se ha scelto un servizio normale, mostriamo i residui come "info" non tappabili.
                  const residualInfoMode = isResidual && !isMicroService;
                  const isDisabled    = isBooked || isUnavailable || residualInfoMode;
                  const isSelected    = selectedTime === time;
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.timeChip,
                        isSelected && styles.timeChipActive,
                        isBooked && styles.timeChipBooked,
                        isUnavailable && styles.timeChipUnavailable,
                        (isMicroService && isResidual) && styles.timeChipMicro,
                        residualInfoMode && styles.timeChipResidualInfo,
                      ]}
                      onPress={() => {
                        if (residualInfoMode) {
                          const msg = `Lo slot delle ${time} è uno spazio da 15 min lasciato libero da un altro cliente.\n\nÈ prenotabile solo per:\n• Pulizia Collo (€4)\n• Rifinitura Basette (€5)\n\nVuoi cambiare servizio?`;
                          if (Platform.OS === 'web') {
                            if (window.confirm(msg)) setStep(1);
                          } else {
                            Alert.alert('Slot 15 minuti', msg, [
                              { text: 'No', style: 'cancel' },
                              { text: 'Sì, cambia servizio', onPress: () => setStep(1) },
                            ]);
                          }
                          return;
                        }
                        if (!isDisabled) setSelectedTime(time);
                      }}
                      disabled={isBooked || isUnavailable}
                    >
                      <Text style={[
                        styles.timeText,
                        isSelected && styles.timeTextActive,
                        isBooked && styles.timeTextBooked,
                        isUnavailable && styles.timeTextUnavailable,
                        residualInfoMode && { color: '#2ecc71' },
                      ]}>
                        {time}
                      </Text>
                      {isMicroService && isResidual && <Text style={styles.timeMicroLabel}>15 min</Text>}
                      {residualInfoMode && <Text style={styles.timeMicroLabel}>libero 15'</Text>}
                      {isBooked          && <Text style={styles.timeBookedLabel}>Occ.</Text>}
                      {isUnavailable     && <Text style={styles.timeUnavailLabel}>N/D</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Step 4: Conferma */}
        {step === 4 && selectedService && selectedBarber && selectedDate && selectedTime && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Riepilogo Prenotazione</Text>
            {confirmError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerIcon}>⚠️</Text>
                <Text style={styles.errorBannerText}>{confirmError}</Text>
              </View>
            ) : null}
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

              {/* Bottone calendario con allarme 1h prima */}
              <TouchableOpacity
                style={styles.calendarBtn}
                onPress={async () => {
                  if (!selectedDate || !selectedTime || !selectedService || !selectedBarber) return;
                  const y = selectedDate.getFullYear();
                  const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
                  const d = String(selectedDate.getDate()).padStart(2, '0');
                  const ok = await downloadICS({
                    date: `${y}-${m}-${d}`,
                    time: selectedTime,
                    service: selectedService.name,
                    barber: selectedBarber.name,
                    slots: selectedService.slots ?? 1,
                    durationMin: selectedService.duration,
                  });
                  if (Platform.OS === 'web') {
                    if (ok) {
                      window.alert('✅ File calendario scaricato!\n\nApri il file scaricato per aggiungerlo al tuo calendario.\nRiceverai una notifica 1 ora prima dell\'appuntamento.');
                    } else {
                      window.alert('⚠️ Non sono riuscito a generare il file calendario. Riprova oppure aggiungi manualmente l\'appuntamento.');
                    }
                  }
                }}
              >
                <View style={styles.calendarBtnInner}>
                  <Text style={styles.calendarBtnIcon}>🔔</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.calendarBtnText}>Aggiungi al calendario</Text>
                    <Text style={styles.calendarBtnSub}>Promemoria automatico 1 ora prima</Text>
                  </View>
                </View>
              </TouchableOpacity>

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
  timeChipUnavailable: { backgroundColor: 'rgba(150,150,150,0.06)', borderColor: 'rgba(150,150,150,0.15)', opacity: 0.45 },
  timeText: { color: 'rgba(255,255,255,0.7)', fontWeight: '600', fontSize: 14 },
  timeTextActive: { color: '#C9A84C' },
  timeTextBooked: { color: 'rgba(231,76,60,0.6)', fontSize: 12 },
  timeTextUnavailable: { color: 'rgba(180,180,180,0.6)', fontSize: 12 },
  timeBookedLabel: { color: 'rgba(231,76,60,0.5)', fontSize: 9, marginTop: 2 },
  timeUnavailLabel: { color: 'rgba(150,150,150,0.55)', fontSize: 9, marginTop: 2 },
  timeChipMicro: {
    backgroundColor: 'rgba(46,204,113,0.18)',
    borderColor: 'rgba(46,204,113,0.55)',
  },
  timeChipResidualInfo: {
    backgroundColor: 'rgba(46,204,113,0.08)',
    borderColor: 'rgba(46,204,113,0.4)',
    borderStyle: 'dashed',
  },
  timeMicroLabel: { color: '#2ecc71', fontSize: 9, marginTop: 2, fontWeight: '700' },

  microInfoBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(46,204,113,0.1)',
    borderRadius: 12, padding: 12, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(46,204,113,0.35)',
  },
  microInfoIcon: { fontSize: 22 },
  microInfoText: { flex: 1, color: 'rgba(255,255,255,0.75)', fontSize: 12, lineHeight: 16 },

  emptyMicroBox: {
    alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  emptyMicroIcon: { fontSize: 44, marginBottom: 10 },
  emptyMicroTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: 16, marginBottom: 6 },
  emptyMicroText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', lineHeight: 18 },

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
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(231,76,60,0.15)',
    borderRadius: 12, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(231,76,60,0.5)',
  },
  errorBannerIcon: { fontSize: 22 },
  errorBannerText: { flex: 1, color: '#FFFFFF', fontSize: 13, lineHeight: 17 },
  calendarBtn: {
    marginHorizontal: 24, marginTop: 14,
    backgroundColor: 'rgba(46,204,113,0.1)',
    borderWidth: 1.5, borderColor: 'rgba(46,204,113,0.5)',
    borderRadius: 14, padding: 14,
  },
  calendarBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  calendarBtnIcon: { fontSize: 26 },
  calendarBtnText: { color: '#2ecc71', fontWeight: '800', fontSize: 14 },
  calendarBtnSub: { color: 'rgba(46,204,113,0.7)', fontSize: 11, marginTop: 2 },
  modalBtnPrimary: { marginHorizontal: 24, marginTop: 16, borderRadius: 14, overflow: 'hidden' },
  modalBtnGrad: { paddingVertical: 15, alignItems: 'center' },
  modalBtnText: { color: '#000000', fontWeight: '900', fontSize: 15 },
  modalBtnSecondary: { marginHorizontal: 24, marginTop: 10, paddingVertical: 12, alignItems: 'center' },
  modalBtnSecondaryText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },

  // Blocco "periodica attiva"
  blockScroll: { padding: 20, paddingTop: 32, paddingBottom: 60 },
  blockCard: { borderRadius: 18, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(201,168,76,0.35)' },
  blockGrad: { padding: 22, alignItems: 'center' },
  blockIconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(201,168,76,0.2)',
    borderWidth: 2, borderColor: '#C9A84C',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  blockIcon: { fontSize: 40 },
  blockTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  blockSubtitle: { color: '#C9A84C', fontSize: 12, fontWeight: '700', marginTop: 4, letterSpacing: 1, marginBottom: 20 },
  blockBox: {
    width: '100%', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 14, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.15)',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  blockBoxLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600' },
  blockBoxValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  blockWarn: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: 'rgba(243,156,18,0.12)', borderRadius: 12,
    padding: 14, marginTop: 14, marginBottom: 18,
    borderWidth: 1, borderColor: 'rgba(243,156,18,0.4)',
  },
  blockWarnIcon: { fontSize: 22 },
  blockWarnText: { flex: 1, color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 18 },
  blockBtnPrimary: { width: '100%', borderRadius: 14, overflow: 'hidden' },
  blockBtnGrad: { paddingVertical: 15, alignItems: 'center' },
  blockBtnText: { color: '#000000', fontWeight: '900', fontSize: 15 },
  blockBtnSecondary: { marginTop: 10, paddingVertical: 12, alignItems: 'center' },
  blockBtnSecondaryText: { color: 'rgba(255,255,255,0.55)', fontSize: 14 },
});
