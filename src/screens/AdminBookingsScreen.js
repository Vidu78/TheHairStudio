import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';

const DAYS_IT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const MONTHS_IT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

const TIMES = [
  '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '15:00', '15:30', '16:00', '16:30', '17:00',
  '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
];

export default function AdminBookingsScreen({ navigation }) {
  const { bookings, updateBookingStatus, cancelBooking, updateBooking, addNotification, fetchBookings, barbers } = useApp();
  const [filter, setFilter] = useState('all');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editBarber, setEditBarber] = useState('');

  const filtered = filter === 'all'
    ? bookings
    : bookings.filter(b => b.status === filter);

  const handleConfirmAction = (booking) => {
    updateBookingStatus(booking.id, 'confirmed');
    fetchBookings?.();
    Alert.alert('✅', `Prenotazione di ${booking.clientName} confermata`);
  };

  const handleCancelAction = (booking) => {
    Alert.alert(
      'Annulla prenotazione',
      `Vuoi annullare l'appuntamento di ${booking.clientName}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Si, annulla', style: 'destructive',
          onPress: () => {
            cancelBooking(booking.id);
            fetchBookings?.();
            if (addNotification) {
              addNotification(booking.clientName, `La tua prenotazione del ${booking.date} alle ${booking.time} e' stata annullata.`);
            }
            Alert.alert('Fatto', `Prenotazione annullata. Cliente notificato.`);
          },
        },
      ]
    );
  };

  const openEditModal = (booking) => {
    setEditingBooking(booking);
    setEditDate(booking.date || '');
    setEditTime(booking.time || '');
    setEditBarber(booking.barber || '');
    setEditModalVisible(true);
  };

  const handleSaveEdit = () => {
    if (!editDate.trim() || !editTime.trim() || !editBarber.trim()) {
      Alert.alert('Attenzione', 'Compila tutti i campi');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(editDate.trim())) {
      Alert.alert('Formato data non valido', 'Usa il formato AAAA-MM-GG');
      return;
    }
    updateBooking(editingBooking.id, {
      date: editDate.trim(),
      time: editTime.trim(),
      barber: editBarber.trim(),
    });
    fetchBookings?.();
    setEditModalVisible(false);
    if (addNotification) {
      addNotification(
        editingBooking.clientName,
        `Il tuo appuntamento e' stato modificato: ${editDate} alle ${editTime} con ${editBarber}.`
      );
    }
    Alert.alert('Salvato', `Modifica salvata. Notifica inviata a ${editingBooking.clientName}.`);
  };

  const FILTERS = [
    { id: 'all', label: 'Tutte', color: '#C9A84C' },
    { id: 'confirmed', label: '✅ Confermate', color: '#2ecc71' },
    { id: 'pending', label: '⏳ In attesa', color: '#f39c12' },
    { id: 'cancelled', label: '❌ Annullate', color: '#e74c3c' },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A0A0A', '#141414']} style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>Prenotazioni</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Filtri */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
        <View style={styles.filters}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterChip, filter === f.id && { borderColor: f.color, backgroundColor: `${f.color}15` }]}
              onPress={() => setFilter(f.id)}
            >
              <Text style={[styles.filterText, filter === f.id && { color: f.color }]}>{f.label}</Text>
              <View style={[styles.filterCount, { backgroundColor: f.color }]}>
                <Text style={styles.filterCountText}>
                  {f.id === 'all' ? bookings.length : bookings.filter(b => b.status === f.id).length}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filtered.map(booking => (
          <View key={booking.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.timeBox}>
                <Text style={styles.timeText}>{booking.time}</Text>
                <Text style={styles.dateText}>{booking.date}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.clientName}>{booking.clientName}</Text>
                <Text style={styles.serviceName}>{booking.service}</Text>
                <Text style={styles.barberName}>✂ {booking.barber}</Text>
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.price}>€{booking.price}</Text>
                <View style={[styles.statusDot,
                  booking.status === 'confirmed' && { backgroundColor: '#2ecc71' },
                  booking.status === 'pending' && { backgroundColor: '#f39c12' },
                  booking.status === 'cancelled' && { backgroundColor: '#e74c3c' },
                ]} />
              </View>
            </View>

            {/* Status label */}
            <View style={styles.statusRow}>
              <Text style={[styles.statusLabel,
                booking.status === 'confirmed' && { color: '#2ecc71' },
                booking.status === 'pending' && { color: '#f39c12' },
                booking.status === 'cancelled' && { color: '#e74c3c' },
              ]}>
                {booking.status === 'confirmed' ? '✅ Confermata' :
                  booking.status === 'pending' ? '⏳ In attesa' : '❌ Annullata'}
              </Text>
            </View>

            {/* Azioni pending */}
            {booking.status === 'pending' && (
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={() => handleConfirmAction(booking)}
                >
                  <Text style={styles.confirmBtnText}>✅ Conferma</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => handleCancelAction(booking)}
                >
                  <Text style={styles.cancelBtnText}>❌ Annulla</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Azioni modifica/cancella per non-cancelled */}
            {booking.status !== 'cancelled' && (
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => openEditModal(booking)}
                >
                  <Text style={styles.editBtnText}>✏️ Modifica</Text>
                </TouchableOpacity>
                {booking.status !== 'pending' && (
                  <TouchableOpacity
                    style={styles.cancelEditBtn}
                    onPress={() => handleCancelAction(booking)}
                  >
                    <Text style={styles.cancelEditBtnText}>🚫 Annulla</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        ))}

        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>Nessuna prenotazione</Text>
          </View>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            <LinearGradient colors={['#1A1209', '#0A0A0A']} style={styles.modalContent}>
              <Text style={styles.modalTitle}>✏️ Modifica Prenotazione</Text>
              {editingBooking && (
                <Text style={styles.modalSubtitle}>
                  Cliente: {editingBooking.clientName}
                </Text>
              )}

              {/* Data */}
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>DATA (YYYY-MM-DD)</Text>
                <View style={styles.modalInputWrapper}>
                  <Text style={styles.modalInputIcon}>📅</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editDate}
                    onChangeText={setEditDate}
                    placeholder="Es. 2026-05-25"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>

              {/* Orario */}
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>ORARIO</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {TIMES.map(t => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.timeChip, editTime === t && styles.timeChipActive]}
                        onPress={() => setEditTime(t)}
                      >
                        <Text style={[styles.timeChipText, editTime === t && styles.timeChipTextActive]}>
                          {t}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
                <Text style={styles.selectedTimeLabel}>
                  Selezionato: {editTime || 'Nessuno'}
                </Text>
              </View>

              {/* Barbiere */}
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>BARBIERE</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(barbers.length > 0 ? barbers.map(b => b.name) : ['Angelo', 'Pietro', 'Domenico']).map(name => (
                    <TouchableOpacity
                      key={name}
                      style={[styles.barberChip, editBarber === name && styles.barberChipActive]}
                      onPress={() => setEditBarber(name)}
                    >
                      <Text style={[styles.barberChipText, editBarber === name && styles.barberChipTextActive]}>
                        {name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text style={styles.modalCancelBtnText}>Annulla</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSaveBtn}
                  onPress={handleSaveEdit}
                >
                  <LinearGradient
                    colors={['#C9A84C', '#A87C30']}
                    style={styles.modalSaveGrad}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.modalSaveBtnText}>💾 Salva</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </KeyboardAvoidingView>
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
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },

  filtersScroll: { backgroundColor: '#0A0A0A', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  filters: {
    flexDirection: 'row', gap: 10, padding: 16,
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  filterText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600' },
  filterCount: {
    borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2,
  },
  filterCountText: { color: '#000', fontWeight: '900', fontSize: 11 },
  content: { flex: 1 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14,
    margin: 12, marginBottom: 0, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  cardHeader: { flexDirection: 'row', gap: 12 },
  timeBox: {
    backgroundColor: 'rgba(201,168,76,0.1)', borderRadius: 10,
    padding: 10, alignItems: 'center', minWidth: 60,
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)',
  },
  timeText: { color: '#C9A84C', fontWeight: '800', fontSize: 14 },
  dateText: { color: 'rgba(255,255,255,0.4)', fontSize: 9, marginTop: 3 },
  cardInfo: { flex: 1 },
  clientName: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  serviceName: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 3 },
  barberName: { color: '#C9A84C', fontSize: 11, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 8 },
  price: { color: '#C9A84C', fontWeight: '900', fontSize: 18 },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#888' },

  statusRow: { marginTop: 8 },
  statusLabel: { fontSize: 11, fontWeight: '600' },

  actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  confirmBtn: {
    flex: 1, backgroundColor: 'rgba(46,204,113,0.15)', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(46,204,113,0.4)',
  },
  confirmBtnText: { color: '#2ecc71', fontWeight: '800', fontSize: 13 },
  cancelBtn: {
    flex: 1, backgroundColor: 'rgba(231,76,60,0.1)', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(231,76,60,0.3)',
  },
  cancelBtnText: { color: '#e74c3c', fontWeight: '800', fontSize: 13 },

  editActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  editBtn: {
    flex: 1, backgroundColor: 'rgba(201,168,76,0.1)', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)',
  },
  editBtnText: { color: '#C9A84C', fontWeight: '700', fontSize: 12 },
  cancelEditBtn: {
    flex: 1, backgroundColor: 'rgba(231,76,60,0.08)', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(231,76,60,0.25)',
  },
  cancelEditBtnText: { color: '#e74c3c', fontWeight: '700', fontSize: 12 },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 16 },

  // Modal styles
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: { borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  modalContent: { padding: 24, paddingBottom: 40 },
  modalTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginBottom: 4 },
  modalSubtitle: { color: '#C9A84C', fontSize: 13, marginBottom: 20 },

  modalField: { marginBottom: 18 },
  modalLabel: { color: '#C9A84C', fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 8 },
  modalInputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)',
    paddingHorizontal: 14, height: 50,
  },
  modalInputIcon: { fontSize: 18, marginRight: 10 },
  modalInput: { flex: 1, color: '#FFFFFF', fontSize: 16 },

  timeChip: {
    paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  timeChipActive: { backgroundColor: 'rgba(201,168,76,0.15)', borderColor: '#C9A84C' },
  timeChipText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600' },
  timeChipTextActive: { color: '#C9A84C' },
  selectedTimeLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 6 },

  barberChip: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  barberChipActive: { backgroundColor: 'rgba(201,168,76,0.15)', borderColor: '#C9A84C' },
  barberChipText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },
  barberChipTextActive: { color: '#C9A84C', fontWeight: '800' },

  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 14, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  modalCancelBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  modalSaveBtn: { flex: 2, borderRadius: 12, overflow: 'hidden' },
  modalSaveGrad: { paddingVertical: 14, alignItems: 'center' },
  modalSaveBtnText: { color: '#000000', fontWeight: '800', fontSize: 15 },
});
