import React, { useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Dimensions, StyleSheet as RN,
} from 'react-native';
import BookingCard from './BookingCard';
import {
  TIMES, ROW_HEIGHT, TIME_COL_WIDTH, HEADER_HEIGHT, LUNCH_GAP,
  MORNING_END_IDX, TOTAL_GRID_HEIGHT,
  timeToY, timeToSlotIndex, getBookingsForBarberDay, formatDateStr,
} from '../utils/calendarUtils';

const SCREEN_WIDTH = Dimensions.get('window').width;
const COL_WIDTH    = (SCREEN_WIDTH - TIME_COL_WIDTH) / 3;

export default function CalendarGrid({ selectedDate, bookings, barbers }) {
  const scrollRef      = useRef(null);
  const selectedDateStr = formatDateStr(selectedDate);

  // Scorre automaticamente a 08:30 (y=0) ma mostra già dall'inizio
  const handleLayout = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const activeBarbers = barbers.length > 0 ? barbers.slice(0, 3) : [];

  return (
    <View style={styles.wrapper}>

      {/* Header fisso: nomi barbieri */}
      <View style={styles.headerRow}>
        <View style={{ width: TIME_COL_WIDTH }} />
        {activeBarbers.map((barber, i) => (
          <View
            key={barber.id}
            style={[
              styles.headerCell,
              i < 2 && styles.headerCellBorder,
              barber.onVacation && styles.headerCellVacation,
            ]}
          >
            <Text style={styles.headerAvatar}>{barber.avatar}</Text>
            <Text style={styles.headerName} numberOfLines={1}>{barber.name}</Text>
            <Text style={styles.headerRole} numberOfLines={1}>{barber.role}</Text>
            {barber.onVacation && (
              <View style={styles.vacationPill}>
                <Text style={styles.vacationPillText}>🏖️ ferie</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Griglia scrollabile */}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        onLayout={handleLayout}
        scrollEventThrottle={16}
      >
        <View style={{ height: TOTAL_GRID_HEIGHT, flexDirection: 'row' }}>

          {/* Colonna orari */}
          <View style={[styles.timeCol, { width: TIME_COL_WIDTH }]}>
            {TIMES.map((time, i) => (
              <Text
                key={time}
                style={[
                  styles.timeLabel,
                  { top: timeToY(i) + ROW_HEIGHT / 2 - 7 },
                ]}
              >
                {time}
              </Text>
            ))}
            {/* Etichetta pausa pranzo */}
            <View style={[styles.lunchLabelWrap, { top: MORNING_END_IDX * ROW_HEIGHT, height: LUNCH_GAP }]}>
              <Text style={styles.lunchLabelText}>☕</Text>
            </View>
          </View>

          {/* Colonne barbieri */}
          {activeBarbers.map((barber, colIdx) => {
            const dayBookings = getBookingsForBarberDay(bookings, barber.name, selectedDateStr);

            return (
              <View
                key={barber.id}
                style={[
                  styles.col,
                  colIdx > 0 && styles.colBorderLeft,
                  barber.onVacation && styles.colVacation,
                ]}
              >
                {/* Linee orizzontali di griglia */}
                {TIMES.map((time, i) => (
                  <View
                    key={time}
                    style={[
                      styles.gridLine,
                      {
                        top: timeToY(i),
                        backgroundColor: i % 2 === 0
                          ? 'transparent'
                          : 'rgba(255,255,255,0.012)',
                      },
                    ]}
                  />
                ))}

                {/* Blocco visivo pausa pranzo */}
                <View
                  style={[
                    styles.lunchBlock,
                    { top: MORNING_END_IDX * ROW_HEIGHT, height: LUNCH_GAP },
                  ]}
                />

                {/* Cards prenotazioni */}
                {dayBookings.map(b => {
                  const idx = timeToSlotIndex(b.time);
                  if (idx < 0) return null;
                  const cardHeight = (b.slots || 1) * ROW_HEIGHT - 4;
                  return (
                    <BookingCard
                      key={b.id}
                      booking={b}
                      height={cardHeight}
                      style={{
                        position: 'absolute',
                        top: timeToY(idx) + 2,
                        left: 2,
                        right: 2,
                      }}
                    />
                  );
                })}

                {/* Overlay barbiere in ferie */}
                {barber.onVacation && (
                  <View style={styles.vacationOverlay}>
                    <Text style={styles.vacationOverlayIcon}>🏖️</Text>
                    <Text style={styles.vacationOverlayText}>In Ferie</Text>
                  </View>
                )}
              </View>
            );
          })}

        </View>

        {/* Spazio extra in fondo per comodità scroll */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Legenda stati in basso */}
      <View style={styles.legend}>
        {[
          { color: '#2ecc71', label: 'Confermato' },
          { color: '#f39c12', label: 'In attesa' },
          { color: '#e74c3c', label: 'Annullato' },
        ].map(item => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },

  // Header fisso
  headerRow: {
    flexDirection: 'row',
    height: HEADER_HEIGHT,
    backgroundColor: '#0A0A0A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 1,
  },
  headerCellBorder: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.06)',
  },
  headerCellVacation: {
    opacity: 0.45,
  },
  headerAvatar: { fontSize: 14, lineHeight: 16 },
  headerName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  headerRole: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 9,
  },
  vacationPill: {
    backgroundColor: 'rgba(231,76,60,0.2)',
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginTop: 2,
    borderWidth: 1,
    borderColor: 'rgba(231,76,60,0.4)',
  },
  vacationPillText: { color: '#e74c3c', fontSize: 8, fontWeight: '700' },

  // Griglia
  scroll: { flex: 1 },

  timeCol: { position: 'relative' },
  timeLabel: {
    position: 'absolute',
    right: 6,
    color: 'rgba(255,255,255,0.28)',
    fontSize: 9,
    fontWeight: '600',
    width: TIME_COL_WIDTH - 8,
    textAlign: 'right',
  },
  lunchLabelWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lunchLabelText: { fontSize: 12 },

  col: {
    flex: 1,
    position: 'relative',
  },
  colBorderLeft: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.06)',
  },
  colVacation: {
    opacity: 0.6,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ROW_HEIGHT,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  lunchBlock: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(201,168,76,0.04)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(201,168,76,0.12)',
  },
  vacationOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  vacationOverlayIcon: { fontSize: 22 },
  vacationOverlayText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '700',
  },

  // Legenda
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 8,
    backgroundColor: '#0A0A0A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 10,
  },
});
