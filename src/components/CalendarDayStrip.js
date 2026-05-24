import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { getWeekDays, formatDateStr, DAYS_IT } from '../utils/calendarUtils';

export default function CalendarDayStrip({ selectedDate, onDayPress, bookings }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekDays   = getWeekDays(selectedDate);
  const selectedStr = formatDateStr(selectedDate);
  const todayStr    = formatDateStr(today);

  const getCount = (date) => {
    const str = formatDateStr(date);
    return bookings.filter(b => b.date === str && b.status !== 'cancelled').length;
  };

  const goToPrevWeek = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 7);
    onDayPress(d);
  };

  const goToNextWeek = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 7);
    onDayPress(d);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.arrow} onPress={goToPrevWeek} activeOpacity={0.6}>
        <Text style={styles.arrowText}>‹</Text>
      </TouchableOpacity>

      <View style={styles.daysRow}>
        {weekDays.map(date => {
          const dateStr   = formatDateStr(date);
          const isSelected = dateStr === selectedStr;
          const isToday    = dateStr === todayStr;
          const count      = getCount(date);

          return (
            <TouchableOpacity
              key={dateStr}
              style={[styles.dayBtn, isSelected && styles.dayBtnActive]}
              onPress={() => onDayPress(date)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dayName, isSelected && styles.activeText]}>
                {DAYS_IT[date.getDay()]}
              </Text>
              <Text style={[styles.dayNum, isSelected && styles.activeText]}>
                {date.getDate()}
              </Text>
              {isToday && <View style={styles.todayDot} />}
              {count > 0 ? (
                <View style={[styles.badge, isSelected && styles.badgeActive]}>
                  <Text style={[styles.badgeText, isSelected && styles.badgeTextActive]}>
                    {count}
                  </Text>
                </View>
              ) : (
                <View style={styles.badgePlaceholder} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={styles.arrow} onPress={goToNextWeek} activeOpacity={0.6}>
        <Text style={styles.arrowText}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  arrow: {
    width: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  arrowText: {
    color: '#C9A84C',
    fontSize: 26,
    fontWeight: '300',
    lineHeight: 30,
  },
  daysRow: {
    flex: 1,
    flexDirection: 'row',
  },
  dayBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
    borderRadius: 10,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayBtnActive: {
    backgroundColor: 'rgba(201,168,76,0.1)',
    borderColor: '#C9A84C',
  },
  dayName: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  dayNum: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 22,
  },
  activeText: {
    color: '#C9A84C',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#C9A84C',
    marginTop: 1,
  },
  badge: {
    marginTop: 2,
    backgroundColor: 'rgba(201,168,76,0.18)',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  badgeActive: {
    backgroundColor: '#C9A84C',
  },
  badgeText: {
    color: '#C9A84C',
    fontSize: 9,
    fontWeight: '900',
  },
  badgeTextActive: {
    color: '#000',
  },
  badgePlaceholder: {
    height: 14,
    marginTop: 2,
  },
});
