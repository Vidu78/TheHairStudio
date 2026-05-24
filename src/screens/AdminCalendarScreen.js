import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import CalendarDayStrip from '../components/CalendarDayStrip';
import CalendarGrid from '../components/CalendarGrid';
import { DAYS_IT, MONTHS_IT, formatDateStr } from '../utils/calendarUtils';

// Se oggi è lunedì (chiuso) o domenica (chiuso), parte dal martedì più vicino
function getInitialDate() {
  const today = new Date();
  const day = today.getDay();
  if (day === 0) { // Domenica → martedì prossimo
    const d = new Date(today);
    d.setDate(today.getDate() + 2);
    return d;
  }
  if (day === 1) { // Lunedì → domani (martedì)
    const d = new Date(today);
    d.setDate(today.getDate() + 1);
    return d;
  }
  return today;
}

export default function AdminCalendarScreen() {
  const { bookings, barbers } = useApp();
  const [selectedDate, setSelectedDate] = useState(getInitialDate());

  const selectedDateStr = formatDateStr(selectedDate);

  const dayTotal = bookings.filter(
    b => b.date === selectedDateStr && b.status !== 'cancelled'
  ).length;

  const dayRevenue = bookings
    .filter(b => b.date === selectedDateStr && b.status === 'confirmed')
    .reduce((sum, b) => sum + (b.price || 0), 0);

  const dateLabel = `${DAYS_IT[selectedDate.getDay()]} ${selectedDate.getDate()} ${MONTHS_IT[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;

  const goToday = () => setSelectedDate(getInitialDate());

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={['#0A0A0A', '#1A0A00']} style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>📆 Calendario</Text>
            <Text style={styles.headerDate}>{dateLabel}</Text>
          </View>
          <View style={styles.headerRight}>
            {dayTotal > 0 && (
              <View style={styles.statPill}>
                <Text style={styles.statPillText}>
                  {dayTotal} app. · €{dayRevenue}
                </Text>
              </View>
            )}
            <TouchableOpacity style={styles.todayBtn} onPress={goToday} activeOpacity={0.7}>
              <Text style={styles.todayBtnText}>Oggi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <CalendarDayStrip
        selectedDate={selectedDate}
        onDayPress={setSelectedDate}
        bookings={bookings}
      />

      <CalendarGrid
        selectedDate={selectedDate}
        bookings={bookings}
        barbers={barbers}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },

  header: {
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerLeft: { flex: 1 },
  headerTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 20,
  },
  headerDate: {
    color: '#C9A84C',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statPill: {
    backgroundColor: 'rgba(201,168,76,0.12)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.28)',
  },
  statPillText: {
    color: '#C9A84C',
    fontWeight: '700',
    fontSize: 11,
  },
  todayBtn: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  todayBtnText: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
    fontSize: 12,
  },
});
