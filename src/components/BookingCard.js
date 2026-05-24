import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ROW_HEIGHT } from '../utils/calendarUtils';

const STATUS_COLOR = {
  confirmed: '#2ecc71',
  pending:   '#f39c12',
  cancelled: '#e74c3c',
};

export default function BookingCard({ booking, height, style }) {
  const color      = STATUS_COLOR[booking.status] || '#888';
  const isCancelled = booking.status === 'cancelled';
  const isCompact   = height < ROW_HEIGHT * 1.6; // card da 1 slot: mostra solo nome + ora

  return (
    <View style={[
      styles.card,
      { borderLeftColor: color, height },
      isCancelled && styles.cancelled,
      style,
    ]}>
      <Text style={styles.clientName} numberOfLines={1}>
        {booking.clientName}
      </Text>

      {!isCompact && (
        <Text style={styles.service} numberOfLines={1}>
          {booking.service}
        </Text>
      )}

      <View style={styles.footer}>
        <Text style={styles.time}>{booking.time}</Text>
        <Text style={[styles.price, { color }]}>€{booking.price}</Text>
      </View>

      {/* Indicatore status */}
      <View style={[styles.statusDot, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderLeftWidth: 3,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 4,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  cancelled: {
    opacity: 0.38,
  },
  clientName: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 13,
  },
  service: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 9,
    lineHeight: 12,
    marginTop: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  time: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 8,
  },
  price: {
    fontSize: 9,
    fontWeight: '900',
  },
  statusDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 5,
    height: 5,
    borderRadius: 3,
  },
});
