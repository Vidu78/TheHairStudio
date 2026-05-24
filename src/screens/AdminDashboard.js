import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, Alert, Image, Switch, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import { BARBER_PHOTOS, SERVICES } from '../data/appData';

const { width } = Dimensions.get('window');

const TOTAL_DAILY_SLOTS = 21;

function StatCard({ label, value, icon, sub, color }) {
  return (
    <LinearGradient
      colors={[`${color}20`, `${color}08`]}
      style={[styles.statCard, { borderColor: `${color}40` }]}
    >
      <Text style={styles.statCardIcon}>{icon}</Text>
      <Text style={[styles.statCardValue, { color }]}>{value}</Text>
      <Text style={styles.statCardLabel}>{label}</Text>
      {sub && <Text style={styles.statCardSub}>{sub}</Text>}
    </LinearGradient>
  );
}

function MiniBarChart({ data }) {
  const maxVal = data.length === 0 ? 1 : Math.max(...data.map(d => d.clients)) || 1;
  return (
    <View style={styles.chart}>
      {data.map((item, i) => (
        <View key={i} style={styles.chartBar}>
          <Text style={styles.chartValue}>{item.clients}</Text>
          <View style={styles.chartBarWrapper}>
            <View
              style={[styles.chartBarFill, { height: `${(item.clients / maxVal) * 100}%` }]}
            />
          </View>
          <Text style={styles.chartDay}>{item.day}</Text>
        </View>
      ))}
    </View>
  );
}

function AvailabilityChart({ data }) {
  return (
    <View style={styles.availChart}>
      {data.map((item, i) => {
        const freePct = item.free;
        const busyPct = item.busy;
        return (
          <View key={i} style={styles.availBar}>
            <Text style={styles.availDay}>{item.day}</Text>
            <View style={styles.availBarTrack}>
              <View style={[styles.availBarFree, { width: `${freePct}%` }]} />
              <View style={[styles.availBarBusy, { width: `${busyPct}%` }]} />
            </View>
            <Text style={styles.availPct}>{freePct}%</Text>
          </View>
        );
      })}
    </View>
  );
}


export default function AdminDashboard({ navigation }) {
  const { bookings, updateBookingStatus, logout, barbers, setBarberVacation, updateBarberPhoto, pageViews, notifications, markNotificationRead, markAllNotificationsRead } = useApp();
  const [activeTab, setActiveTab] = useState('overview');

  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const activeBookings = bookings.filter(b => b.status !== 'cancelled');
  const todayBookings = activeBookings.filter(b => b.date === today);
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
  const cancelNotifications = (notifications || []).filter(n => n.type === 'cancellation');
  const unreadCancellations = cancelNotifications.filter(n => !n.read);
  const totalAlerts = pendingBookings.length + unreadCancellations.length;

  const weekBookings = activeBookings.filter(b => new Date(b.date) >= startOfWeek);
  const monthBookings = activeBookings.filter(b => new Date(b.date) >= startOfMonth);

  const sumRevenue = (list) => list.reduce((acc, b) => acc + (b.price || 0), 0);

  const todayRevenue = sumRevenue(todayBookings);
  const weekRevenue = sumRevenue(weekBookings);
  const monthRevenue = sumRevenue(monthBookings);

  const getWeeklyAvailability = () => {
    const dayNames = ['Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    const activeDayNums = [2, 3, 4, 5, 6]; // Tue–Sat
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // start of Mon
    const tuesday = new Date(monday);
    tuesday.setDate(monday.getDate() + 1);
    const activeBarberCount = Math.max(1, barbers.filter(b => !b.onVacation).length);
    const totalSlots = TOTAL_DAILY_SLOTS * activeBarberCount;
    return dayNames.map((day, i) => {
      const d = new Date(tuesday);
      d.setDate(tuesday.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayBookings = activeBookings.filter(b => b.date === dateStr);
      const usedSlots = dayBookings.reduce((acc, b) => acc + (b.slots || 1), 0);
      const busyPct = Math.min(100, Math.round((usedSlots / totalSlots) * 100));
      return { day, free: 100 - busyPct, busy: busyPct };
    });
  };

  const getTopService = () => {
    const counts = {};
    activeBookings.forEach(b => { counts[b.service] = (counts[b.service] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : '—';
  };

  const getPopularDays = () => {
    const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    activeBookings.forEach(b => {
      const d = new Date(b.date).getDay();
      counts[d]++;
    });
    return days.map((day, i) => ({ day, clients: counts[i] })).filter((_, i) => i > 0 && i < 7);
  };

  const getServiceBreakdown = () => {
    const counts = {};
    activeBookings.forEach(b => { counts[b.service] = (counts[b.service] || 0) + 1; });
    const total = activeBookings.length || 1;
    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        pct: Math.round((count / total) * 100),
        revenue: sumRevenue(activeBookings.filter(b => b.service === name)),
        color: '#C9A84C',
      }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5);
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      // Su web Alert.alert non invoca i callback — usiamo window.confirm direttamente
      if (window.confirm("Vuoi uscire dall'area admin?")) logout();
      return;
    }
    Alert.alert('Logout', "Vuoi uscire dall'area admin?", [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Esci', style: 'destructive', onPress: logout },
    ]);
  };

  const handleNotifications = () => {
    navigation.navigate('AdminBookings');
  };

  const handleChangePhoto = async (barber) => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permesso negato', 'Abilita l\'accesso alla galleria nelle impostazioni.');
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      updateBarberPhoto(barber.id, result.assets[0].uri);
    }
  };

  const handleToggleVacation = (barber, value) => {
    setBarberVacation(barber.id, value);
    Alert.alert(
      value ? 'Ferie attivate' : 'Ferie disattivate',
      `${barber.name} ${value ? 'e\' ora in ferie' : 'e\' tornato disponibile'}`
    );
  };

  // Calcola disponibilità oggi per ogni barbiere
  const getBarberAvailability = (barberName) => {
    const barberToday = todayBookings.filter(b => b.barber === barberName);
    let usedSlots = 0;
    barberToday.forEach(b => {
      const svc = SERVICES.find(s => s.name === b.service);
      usedSlots += svc ? (svc.slots || 1) : 1;
    });
    const freeSlots = Math.max(0, TOTAL_DAILY_SLOTS - usedSlots);
    return { used: usedSlots, free: freeSlots, total: TOTAL_DAILY_SLOTS };
  };

  const TABS = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'bookings', label: 'Prenotazioni', icon: '📅' },
    { id: 'barbers', label: 'Barbieri', icon: '✂️' },
    { id: 'stats', label: 'Statistiche', icon: '📈' },
  ];

  return (
    <View style={styles.container}>
      {/* Header Admin */}
      <LinearGradient colors={['#0A0A0A', '#1A0A00']} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerWelcome}>Area Admin</Text>
            <Text style={styles.headerName}>The Hair Studio</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.notifBtn} onPress={() => { setActiveTab('bookings'); markAllNotificationsRead(); }}>
              {totalAlerts > 0 && (
                <View style={[styles.notifBadge, unreadCancellations.length > 0 && { backgroundColor: '#e74c3c' }]}>
                  <Text style={styles.notifBadgeText}>{totalAlerts}</Text>
                </View>
              )}
              <Text style={styles.notifIcon}>🔔</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutIcon}>🚪</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBarScroll}>
          <View style={styles.tabBar}>
            {TABS.map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Text style={styles.tabIcon}>{tab.icon}</Text>
                <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <View>
            {/* Riquadro principale revenue */}
            <LinearGradient colors={['#C9A84C', '#A87C30']} style={styles.revenueCard}>
              <View style={styles.revenueTop}>
                <Text style={styles.revenueLabel}>Incasso del Mese</Text>
                {pageViews > 0 && (
                  <View style={styles.growthBadge}>
                    <Text style={styles.growthText}>👁 {pageViews} visite</Text>
                  </View>
                )}
              </View>
              <Text style={styles.revenueValue}>€{monthRevenue}</Text>
              <View style={styles.revenueRow}>
                <View style={styles.revenueItem}>
                  <Text style={styles.revItemLabel}>Oggi</Text>
                  <Text style={styles.revItemValue}>€{todayRevenue}</Text>
                </View>
                <View style={styles.revenueDivider} />
                <View style={styles.revenueItem}>
                  <Text style={styles.revItemLabel}>Settimana</Text>
                  <Text style={styles.revItemValue}>€{weekRevenue}</Text>
                </View>
                <View style={styles.revenueDivider} />
                <View style={styles.revenueItem}>
                  <Text style={styles.revItemLabel}>Mese</Text>
                  <Text style={styles.revItemValue}>€{monthRevenue}</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Stat cards grid */}
            <View style={styles.statsGrid}>
              <StatCard label="Prenotazioni oggi" value={todayBookings.length} icon="👥" color="#4ECDC4" />
              <StatCard label="Questa settimana" value={weekBookings.length} icon="📆" color="#45B7D1" />
              <StatCard label="Questo mese" value={monthBookings.length} icon="📊" color="#96CEB4" />
              <StatCard label="Visite sito" value={pageViews || 0} icon="👁" color="#FFEAA7" />
            </View>

            {/* Disponibilità oggi */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Disponibilità Oggi</Text>
              {barbers.map(barber => {
                const avail = getBarberAvailability(barber.name);
                const freePct = (avail.free / avail.total) * 100;
                return (
                  <View key={barber.id} style={styles.availCard}>
                    <View style={styles.availCardHeader}>
                      <Text style={styles.availBarberName}>{barber.name}</Text>
                      {barber.onVacation && (
                        <View style={styles.vacationBadge}>
                          <Text style={styles.vacationBadgeText}>IN FERIE</Text>
                        </View>
                      )}
                      <Text style={styles.availSlots}>
                        {barber.onVacation ? 'N/A' : `${avail.free}/${avail.total} slot liberi`}
                      </Text>
                    </View>
                    {!barber.onVacation && (
                      <View style={styles.availTrack}>
                        <View style={[styles.availFill, { width: `${freePct}%` }]} />
                        <View style={[styles.availFillBusy, { width: `${100 - freePct}%` }]} />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Appuntamenti oggi */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Appuntamenti Oggi</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{todayBookings.length}</Text>
                </View>
              </View>
              {todayBookings.map(booking => (
                <BookingRow
                  key={booking.id}
                  booking={booking}
                  onStatusChange={updateBookingStatus}
                />
              ))}
            </View>

            {/* Servizio top */}
            <View style={styles.topServiceCard}>
              <Text style={styles.topServiceLabel}>🏆 Servizio più richiesto</Text>
              <Text style={styles.topServiceName}>{getTopService()}</Text>
            </View>
          </View>
        )}

        {/* BOOKINGS TAB */}
        {activeTab === 'bookings' && (
          <View style={styles.section}>

            {/* Cancellazioni notifiche */}
            {cancelNotifications.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: '#e74c3c', marginBottom: 0 }]}>❌ Cancellazioni Ricevute</Text>
                  <View style={[styles.countBadge, { backgroundColor: '#e74c3c' }]}>
                    <Text style={styles.countBadgeText}>{cancelNotifications.length}</Text>
                  </View>
                </View>
                <View style={{ height: 12 }} />
                {cancelNotifications.map(notif => (
                  <CancellationCard
                    key={notif.id}
                    notif={notif}
                    onRead={() => markNotificationRead(notif.id)}
                  />
                ))}
                <View style={{ height: 20 }} />
              </>
            )}

            {pendingBookings.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>⏳ In Attesa di Conferma</Text>
                {pendingBookings.map(booking => (
                  <BookingRow
                    key={booking.id}
                    booking={booking}
                    onStatusChange={updateBookingStatus}
                    showActions
                  />
                ))}
                <View style={{ height: 16 }} />
              </>
            )}

            <Text style={styles.sectionTitle}>✅ Confermate</Text>
            {confirmedBookings.length === 0 && (
              <Text style={{ color: 'rgba(255,255,255,0.3)', paddingVertical: 10 }}>Nessuna prenotazione confermata</Text>
            )}
            {confirmedBookings.map(booking => (
              <BookingRow
                key={booking.id}
                booking={booking}
                onStatusChange={updateBookingStatus}
              />
            ))}
          </View>
        )}

        {/* BARBIERI TAB */}
        {activeTab === 'barbers' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gestione Barbieri</Text>
            {barbers.map(barber => {
              const photoSource = barber.photoOverride
                ? { uri: barber.photoOverride }
                : BARBER_PHOTOS[barber.id];
              return (
                <View key={barber.id} style={styles.barberManageCard}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                    style={styles.barberManageGrad}
                  >
                    {/* Top row: photo + info + vacation badge */}
                    <View style={styles.barberManageTop}>
                      <View style={styles.barberPhotoWrapper}>
                        <Image
                          source={photoSource}
                          style={styles.barberManagePhoto}
                          resizeMode="cover"
                        />
                        {barber.onVacation && (
                          <View style={styles.photoVacationOverlay}>
                            <Text style={styles.photoVacationIcon}>🏖️</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.barberManageInfo}>
                        <View style={styles.barberManageNameRow}>
                          <Text style={styles.barberManageName}>{barber.name}</Text>
                          {barber.onVacation && (
                            <View style={styles.vacationBadge}>
                              <Text style={styles.vacationBadgeText}>IN FERIE</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.barberManageRole}>{barber.role}</Text>
                        <Text style={styles.barberManageSpec}>{barber.speciality}</Text>
                      </View>
                    </View>

                    {/* Actions row */}
                    <View style={styles.barberManageActions}>
                      {/* Toggle ferie */}
                      <View style={styles.vacationToggleRow}>
                        <Text style={styles.vacationToggleLabel}>
                          {barber.onVacation ? '🏖️ In ferie' : '✅ Disponibile'}
                        </Text>
                        <Switch
                          value={barber.onVacation}
                          onValueChange={(val) => handleToggleVacation(barber, val)}
                          trackColor={{ false: 'rgba(255,255,255,0.15)', true: 'rgba(231,76,60,0.5)' }}
                          thumbColor={barber.onVacation ? '#e74c3c' : '#C9A84C'}
                        />
                      </View>

                      {/* Cambia foto */}
                      <TouchableOpacity
                        style={styles.changePhotoBtn}
                        onPress={() => handleChangePhoto(barber)}
                      >
                        <Text style={styles.changePhotoBtnText}>📷 Cambia Foto</Text>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </View>
              );
            })}
          </View>
        )}

        {/* STATS TAB */}
        {activeTab === 'stats' && (
          <View>
            {/* Grafico clienti per giorno */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Prenotazioni per Giorno</Text>
              <View style={styles.chartCard}>
                {getPopularDays().every(d => d.clients === 0) ? (
                  <Text style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', paddingVertical: 20 }}>
                    Nessuna prenotazione ancora
                  </Text>
                ) : (
                  <MiniBarChart data={getPopularDays()} />
                )}
              </View>
            </View>

            {/* Disponibilità settimanale */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Disponibilità Settimana Corrente</Text>
              <View style={styles.chartCard}>
                <View style={styles.availLegend}>
                  <View style={styles.availLegendItem}>
                    <View style={[styles.availLegendDot, { backgroundColor: '#4ECDC4' }]} />
                    <Text style={styles.availLegendText}>Libero</Text>
                  </View>
                  <View style={styles.availLegendItem}>
                    <View style={[styles.availLegendDot, { backgroundColor: '#e74c3c' }]} />
                    <Text style={styles.availLegendText}>Occupato</Text>
                  </View>
                </View>
                <AvailabilityChart data={getWeeklyAvailability()} />
              </View>
            </View>

            {/* Servizi breakdown */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Servizi più Richiesti</Text>
              {getServiceBreakdown().length === 0 ? (
                <Text style={{ color: 'rgba(255,255,255,0.3)', paddingVertical: 10 }}>
                  Nessun dato disponibile
                </Text>
              ) : (
                getServiceBreakdown().map((item, i) => (
                  <View key={i} style={styles.serviceStatRow}>
                    <View style={styles.serviceStatLeft}>
                      <Text style={styles.serviceStatName}>{item.name}</Text>
                      <View style={styles.serviceStatBar}>
                        <View style={[styles.serviceStatFill, { width: `${item.pct}%`, backgroundColor: item.color }]} />
                      </View>
                    </View>
                    <View style={styles.serviceStatRight}>
                      <Text style={[styles.serviceStatPct, { color: item.color }]}>{item.pct}%</Text>
                      <Text style={styles.serviceStatRev}>€{item.revenue}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* KPI reali */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>KPI Reali</Text>
              <View style={styles.kpiGrid}>
                {[
                  { label: 'Scontrino medio', value: activeBookings.length ? `€${(sumRevenue(activeBookings) / activeBookings.length).toFixed(1)}` : '€0', icon: '💳' },
                  { label: 'Prenotazioni totali', value: activeBookings.length, icon: '📋' },
                  { label: 'In attesa', value: pendingBookings.length, icon: '⏳' },
                  { label: 'Confermate', value: confirmedBookings.length, icon: '✅' },
                  { label: 'Servizio top', value: getTopService(), icon: '🏆' },
                  { label: 'Visite sito', value: pageViews || 0, icon: '👁' },
                ].map((kpi, i) => (
                  <View key={i} style={styles.kpiCard}>
                    <Text style={styles.kpiIcon}>{kpi.icon}</Text>
                    <Text style={styles.kpiValue}>{kpi.value}</Text>
                    <Text style={styles.kpiLabel}>{kpi.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

function CancellationCard({ notif, onRead }) {
  const dateStr = notif.date || '';
  const timeStr = notif.time || '';
  const ts = notif.timestamp ? new Date(notif.timestamp).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
  return (
    <View style={[styles.cancellationCard, !notif.read && styles.cancellationCardUnread]}>
      <View style={styles.cancellationLeft}>
        <View style={styles.cancellationIconWrap}>
          <Text style={{ fontSize: 20 }}>❌</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cancellationClient}>{notif.clientName}</Text>
          <Text style={styles.cancellationService}>{notif.service} • {notif.barber}</Text>
          <Text style={styles.cancellationDateTime}>{dateStr} alle {timeStr}</Text>
          <Text style={styles.cancellationTs}>Annullata il {ts}</Text>
        </View>
      </View>
      <View style={styles.cancellationRight}>
        <Text style={styles.cancellationPrice}>€{notif.price}</Text>
        {!notif.read && (
          <TouchableOpacity style={styles.readBtn} onPress={onRead}>
            <Text style={styles.readBtnText}>Visto ✓</Text>
          </TouchableOpacity>
        )}
        {notif.read && (
          <View style={styles.readDone}><Text style={styles.readDoneText}>✓ Letto</Text></View>
        )}
      </View>
    </View>
  );
}

function BookingRow({ booking, onStatusChange, showActions }) {
  const statusColor = booking.status === 'confirmed' ? '#2ecc71' : '#f39c12';
  const statusLabel = booking.status === 'confirmed' ? '✅ Confermato' : '⏳ In attesa';

  return (
    <View style={styles.bookingRow}>
      <View style={styles.bookingTime}>
        <Text style={styles.bookingTimeText}>{booking.time}</Text>
        <Text style={styles.bookingBarberText}>{booking.barber}</Text>
      </View>
      <View style={styles.bookingInfo}>
        <Text style={styles.bookingClient}>{booking.clientName}</Text>
        <Text style={styles.bookingService}>{booking.service}</Text>
        <Text style={[styles.bookingStatus, { color: statusColor }]}>{statusLabel}</Text>
      </View>
      <View style={styles.bookingRight}>
        <Text style={styles.bookingPrice}>€{booking.price}</Text>
        {showActions && booking.status === 'pending' && (
          <TouchableOpacity
            style={styles.confirmMiniBtn}
            onPress={() => onStatusChange(booking.id, 'confirmed')}
          >
            <Text style={styles.confirmMiniBtnText}>Conferma</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },
  header: { paddingTop: 50, paddingBottom: 0 },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 16,
  },
  headerWelcome: { color: 'rgba(255,255,255,0.5)', fontSize: 12, letterSpacing: 1 },
  headerName: { color: '#FFFFFF', fontWeight: '900', fontSize: 20 },
  headerRight: { flexDirection: 'row', gap: 10 },
  notifBtn: { position: 'relative', padding: 8 },
  notifBadge: {
    position: 'absolute', top: 4, right: 4, width: 18, height: 18,
    borderRadius: 9, backgroundColor: '#e74c3c', alignItems: 'center', justifyContent: 'center', zIndex: 1,
  },
  notifBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  notifIcon: { fontSize: 22 },
  logoutBtn: { padding: 8 },
  logoutIcon: { fontSize: 22 },

  tabBarScroll: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  tabBar: { flexDirection: 'row' },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: '#C9A84C' },
  tabIcon: { fontSize: 16 },
  tabLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600' },
  tabLabelActive: { color: '#C9A84C' },

  content: { flex: 1 },

  revenueCard: { margin: 20, borderRadius: 20, padding: 20 },
  revenueTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  revenueLabel: { color: 'rgba(0,0,0,0.6)', fontSize: 13, fontWeight: '600' },
  growthBadge: {
    backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  growthText: { color: '#000000', fontWeight: '800', fontSize: 12 },
  revenueValue: { color: '#000000', fontSize: 42, fontWeight: '900', marginBottom: 16 },
  revenueRow: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 12, padding: 12 },
  revenueItem: { flex: 1, alignItems: 'center' },
  revenueDivider: { width: 1, backgroundColor: 'rgba(0,0,0,0.15)' },
  revItemLabel: { color: 'rgba(0,0,0,0.5)', fontSize: 11 },
  revItemValue: { color: '#000000', fontWeight: '800', fontSize: 16, marginTop: 4 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 20, marginBottom: 24 },
  statCard: {
    width: (width - 52) / 2, borderRadius: 14, padding: 16,
    borderWidth: 1, alignItems: 'flex-start',
  },
  statCardIcon: { fontSize: 28, marginBottom: 8 },
  statCardValue: { fontSize: 24, fontWeight: '900' },
  statCardLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
  statCardSub: { color: 'rgba(255,255,255,0.4)', fontSize: 10 },

  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginBottom: 14 },
  countBadge: {
    backgroundColor: '#C9A84C', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  countBadgeText: { color: '#000', fontWeight: '900', fontSize: 12 },

  // Disponibilità cards (overview)
  availCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  availCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  availBarberName: { color: '#FFFFFF', fontWeight: '700', fontSize: 14, flex: 1 },
  availSlots: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  availTrack: {
    height: 8, borderRadius: 4, overflow: 'hidden',
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)',
  },
  availFill: { height: '100%', backgroundColor: '#4ECDC4', borderRadius: 4 },
  availFillBusy: { height: '100%', backgroundColor: '#e74c3c', borderRadius: 4 },

  vacationBadge: {
    backgroundColor: 'rgba(231,76,60,0.2)',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: 'rgba(231,76,60,0.5)',
    marginRight: 8,
  },
  vacationBadgeText: { color: '#e74c3c', fontWeight: '900', fontSize: 10 },

  bookingRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  bookingTime: {
    width: 56, marginRight: 14, alignItems: 'center',
    backgroundColor: 'rgba(201,168,76,0.1)', borderRadius: 8, padding: 8,
  },
  bookingTimeText: { color: '#C9A84C', fontWeight: '800', fontSize: 13 },
  bookingBarberText: { color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 2 },
  bookingInfo: { flex: 1 },
  bookingClient: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  bookingService: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
  bookingStatus: { fontSize: 11, marginTop: 2 },
  bookingRight: { alignItems: 'flex-end', gap: 6 },
  bookingPrice: { color: '#C9A84C', fontWeight: '900', fontSize: 16 },
  confirmMiniBtn: {
    backgroundColor: '#C9A84C', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  confirmMiniBtnText: { color: '#000', fontWeight: '800', fontSize: 11 },

  topServiceCard: {
    marginHorizontal: 20, marginBottom: 24,
    backgroundColor: 'rgba(201,168,76,0.1)', borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)',
  },
  topServiceLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  topServiceName: { color: '#C9A84C', fontWeight: '900', fontSize: 20, marginTop: 4 },

  // Barbers tab
  barberManageCard: {
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.15)',
    marginBottom: 14,
  },
  barberManageGrad: { padding: 16 },
  barberManageTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  barberPhotoWrapper: { position: 'relative', marginRight: 14 },
  barberManagePhoto: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 2, borderColor: 'rgba(201,168,76,0.4)',
  },
  photoVacationOverlay: {
    position: 'absolute', bottom: 0, right: 0,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center',
  },
  photoVacationIcon: { fontSize: 14 },
  barberManageInfo: { flex: 1 },
  barberManageNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  barberManageName: { color: '#FFFFFF', fontWeight: '800', fontSize: 18 },
  barberManageRole: { color: '#C9A84C', fontSize: 13, fontWeight: '600' },
  barberManageSpec: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 },
  barberManageActions: {
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 14, gap: 12,
  },
  vacationToggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  vacationToggleLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' },
  changePhotoBtn: {
    backgroundColor: 'rgba(201,168,76,0.1)',
    borderRadius: 10, paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)',
  },
  changePhotoBtnText: { color: '#C9A84C', fontWeight: '700', fontSize: 13 },

  // Stats tab
  chartCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14,
    padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 8 },
  chartBar: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  chartValue: { color: '#C9A84C', fontSize: 11, fontWeight: '700', marginBottom: 4 },
  chartBarWrapper: { width: '80%', height: '70%', justifyContent: 'flex-end' },
  chartBarFill: {
    width: '100%', backgroundColor: '#C9A84C',
    borderRadius: 4, opacity: 0.8,
  },
  chartDay: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 6 },

  availLegend: { flexDirection: 'row', gap: 16, marginBottom: 14 },
  availLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  availLegendDot: { width: 10, height: 10, borderRadius: 5 },
  availLegendText: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },

  availChart: { gap: 10 },
  availBar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  availDay: { color: 'rgba(255,255,255,0.5)', fontSize: 12, width: 30 },
  availBarTrack: {
    flex: 1, height: 10, borderRadius: 5, overflow: 'hidden',
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.06)',
  },
  availBarFree: { height: '100%', backgroundColor: '#4ECDC4' },
  availBarBusy: { height: '100%', backgroundColor: '#e74c3c' },
  availPct: { color: '#4ECDC4', fontSize: 11, fontWeight: '700', width: 30, textAlign: 'right' },

  serviceStatRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 14,
  },
  serviceStatLeft: { flex: 1, marginRight: 14 },
  serviceStatName: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  serviceStatBar: {
    height: 6, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3, overflow: 'hidden',
  },
  serviceStatFill: { height: '100%', borderRadius: 3 },
  serviceStatRight: { alignItems: 'flex-end', minWidth: 50 },
  serviceStatPct: { fontWeight: '800', fontSize: 14 },
  serviceStatRev: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpiCard: {
    width: (width - 64) / 3, backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  kpiIcon: { fontSize: 22, marginBottom: 6 },
  kpiValue: { color: '#C9A84C', fontWeight: '900', fontSize: 16 },
  kpiLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9, textAlign: 'center', marginTop: 4 },

  cancellationCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: 'rgba(231,76,60,0.06)', borderRadius: 12,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(231,76,60,0.2)',
  },
  cancellationCardUnread: {
    borderColor: 'rgba(231,76,60,0.5)',
    backgroundColor: 'rgba(231,76,60,0.1)',
  },
  cancellationLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cancellationIconWrap: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: 'rgba(231,76,60,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  cancellationClient: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  cancellationService: { color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 2 },
  cancellationDateTime: { color: '#e74c3c', fontSize: 12, marginTop: 3, fontWeight: '600' },
  cancellationTs: { color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 2 },
  cancellationRight: { alignItems: 'flex-end', gap: 8, paddingLeft: 10 },
  cancellationPrice: { color: 'rgba(255,255,255,0.5)', fontWeight: '700', fontSize: 14, textDecorationLine: 'line-through' },
  readBtn: {
    backgroundColor: 'rgba(46,204,113,0.15)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(46,204,113,0.4)',
  },
  readBtnText: { color: '#2ecc71', fontWeight: '700', fontSize: 11 },
  readDone: { paddingHorizontal: 8, paddingVertical: 4 },
  readDoneText: { color: 'rgba(46,204,113,0.5)', fontSize: 11 },
});
