// ─── Costanti layout griglia ──────────────────────────────────────────────────
export const ROW_HEIGHT      = 60;   // px per slot da 30 min
export const TIME_COL_WIDTH  = 56;   // colonna etichette orario
export const HEADER_HEIGHT   = 52;   // riga nomi barbieri (fissa sopra la griglia)
export const LUNCH_GAP       = 36;   // separatore visivo pausa pranzo 13:00–15:00

// Tutti i 21 slot da 30 min (identici a BookingScreen e PeriodicBookingScreen)
export const TIMES = [
  '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30',
  '15:00', '15:30', '16:00', '16:30', '17:00',
  '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
];

export const MORNING_END_IDX = 9;  // TIMES[0..8] = mattina, TIMES[9..20] = pomeriggio

export const DAYS_IT   = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
export const MONTHS_IT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

// ─── Calcoli posizione ────────────────────────────────────────────────────────

// Y assoluta (dentro ScrollView) per un dato indice di slot
export function timeToY(slotIndex) {
  if (slotIndex < MORNING_END_IDX) return slotIndex * ROW_HEIGHT;
  return MORNING_END_IDX * ROW_HEIGHT + LUNCH_GAP + (slotIndex - MORNING_END_IDX) * ROW_HEIGHT;
}

export const TOTAL_GRID_HEIGHT =
  MORNING_END_IDX * ROW_HEIGHT +
  LUNCH_GAP +
  (TIMES.length - MORNING_END_IDX) * ROW_HEIGHT;
// = 540 + 36 + 720 = 1296 px

export function timeToSlotIndex(timeStr) {
  return TIMES.indexOf(timeStr);
}

export function slotIndexToTime(index) {
  return TIMES[index] ?? null;
}

// ─── Formattazione date ───────────────────────────────────────────────────────

export function formatDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Restituisce [Mar, Mer, Gio, Ven, Sab] della settimana ISO contenente `date`
export function getWeekDays(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Dom, 1=Lun, ..., 6=Sab
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(d);
  monday.setDate(d.getDate() - daysFromMonday);
  const result = [];
  for (let i = 1; i <= 5; i++) { // Lun+1=Mar … Lun+5=Sab
    const wd = new Date(monday);
    wd.setDate(monday.getDate() + i);
    result.push(wd);
  }
  return result;
}

// ─── Logica prenotazioni ──────────────────────────────────────────────────────

export function getBookingsForBarberDay(bookings, barberName, dateStr) {
  return bookings
    .filter(b => b.barber === barberName && b.date === dateStr)
    .sort((a, b) => a.time.localeCompare(b.time));
}

// Controlla se un barbiere ha il timeslot libero per slotsNeeded slot consecutivi
export function isSlotAvailable(bookings, barberName, dateStr, timeStr, slotsNeeded, excludeId = null) {
  const targetIdx = TIMES.indexOf(timeStr);
  if (targetIdx < 0) return false;

  // Regola business: servizi da 2 slot non possono partire alle 12:30
  if (slotsNeeded > 1 && timeStr === '12:30') return false;

  // Verifica che i slot necessari esistano nell'array
  for (let i = 0; i < slotsNeeded; i++) {
    if (!TIMES[targetIdx + i]) return false;
  }

  // Conflitti con prenotazioni esistenti per questo barbiere+giorno
  const existing = bookings.filter(b =>
    b.barber === barberName &&
    b.date   === dateStr &&
    b.status !== 'cancelled' &&
    b.id     !== excludeId
  );

  for (const b of existing) {
    const bIdx   = TIMES.indexOf(b.time);
    const bSlots = b.slots || 1;
    if (bIdx < 0) continue;
    for (let i = 0; i < slotsNeeded; i++) {
      for (let j = 0; j < bSlots; j++) {
        if (targetIdx + i === bIdx + j) return false;
      }
    }
  }
  return true;
}

// ─── Matematica coordinate per il drag (Fase 2) ──────────────────────────────

export function screenXToBarberIndex(x, timeColWidth, colWidth) {
  const relX = x - timeColWidth;
  if (relX < 0) return null;
  const idx = Math.floor(relX / colWidth);
  return (idx >= 0 && idx <= 2) ? idx : null;
}

export function screenYToSlotIndex(y, scrollOffset, aboveGridHeight) {
  const relY = y + scrollOffset - aboveGridHeight;
  if (relY < 0) return null;
  const morningHeight = MORNING_END_IDX * ROW_HEIGHT;
  if (relY < morningHeight) return Math.floor(relY / ROW_HEIGHT);
  if (relY < morningHeight + LUNCH_GAP) return null;
  const afternoonIdx = Math.floor((relY - morningHeight - LUNCH_GAP) / ROW_HEIGHT);
  const maxAfternoon = TIMES.length - MORNING_END_IDX - 1;
  if (afternoonIdx < 0 || afternoonIdx > maxAfternoon) return null;
  return MORNING_END_IDX + afternoonIdx;
}
