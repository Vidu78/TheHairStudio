export const SALON_INFO = {
  name: 'The Hair Studio',
  tagline: 'Stile & Professionalità a Noci',
  address: 'Via Alessandro Manzoni, 38',
  city: 'Noci (BA) 70015',
  phone: '+39 328 594 4459',
  email: 'thehair.studio@gmail.com',
  instagram: '@thehairstudio_noci',
  rating: 4.9,
  reviewCount: 127,
  hours: {
    monday: null,
    tuesday: { open: '08:30', close: '13:00', afternoon: { open: '15:00', close: '21:00' } },
    wednesday: { open: '08:30', close: '13:00', afternoon: { open: '15:00', close: '21:00' } },
    thursday: { open: '08:30', close: '13:00', afternoon: { open: '15:00', close: '21:00' } },
    friday: { open: '08:30', close: '13:00', afternoon: { open: '15:00', close: '21:00' } },
    saturday: { open: '08:30', close: '20:30' },
    sunday: null,
  },
};

// slots = numero di slot da 30 minuti occupati
export const SERVICES = [
  { id: '1', name: 'Taglio',                   duration: 30, slots: 1, price: 13, emoji: '✂️',       iconName: 'content-cut',                              iconLib: 'mci', category: 'taglio' },
  { id: '2', name: 'Taglio + Barba',           duration: 45, slots: 2, price: 18, emoji: '✂️', emoji2: '💈', iconName: 'content-cut', iconName2: 'razor-double-edge', iconLib: 'mci', category: 'taglio' },
  { id: '3', name: 'Taglio + Shampoo',         duration: 60, slots: 2, price: 18, emoji: '✂️', emoji2: '🚿', iconName: 'content-cut', iconName2: 'shower-head',       iconLib: 'mci', category: 'taglio' },
  { id: '4', name: 'Taglio + Barba + Shampoo', duration: 60, slots: 2, price: 23, emoji: '👑',       iconName: 'crown',                                    iconLib: 'mci', category: 'taglio' },
  { id: '5', name: 'Barba Classica',           duration: 30, slots: 1, price: 5,  emoji: '💈',       iconName: 'razor-double-edge',                        iconLib: 'mci', category: 'barba' },
  { id: '6', name: 'Barba Modellata',          duration: 30, slots: 1, price: 6,  emoji: '💈',       iconName: 'razor-double-edge',                        iconLib: 'mci', category: 'barba' },
];

export const BARBERS = [
  { id: '1', name: 'Angelo', surname: '', role: 'Maestro', avatar: '👑', speciality: 'Taglio & Barba', onVacation: false },
  { id: '2', name: 'Pietro', surname: '', role: 'Barbiere', avatar: '✂️', speciality: 'Taglio Classico', onVacation: false },
  { id: '3', name: 'Domenico', surname: '', role: 'Barbiere', avatar: '💈', speciality: 'Barba & Styling', onVacation: false },
];

export const BARBER_PHOTOS = {
  '1': require('../../assets/images/angelo.jpg'),
  '2': require('../../assets/images/pietro.jpg'),
  '3': require('../../assets/images/domenico.jpg'),
};

export const ADMIN_CREDENTIALS = {
  email: 'admin@thehairstudio.it',
  password: 'THS2024!',
};

export const MOCK_BOOKINGS = [];

export const PERIODIC_OPTIONS = [
  { id: 'weekly',   label: 'Ogni Settimana', description: '1 volta a settimana', emoji: '📅', iconName: 'calendar-week',  iconLib: 'mci', intervalDays: 7  },
  { id: 'biweekly', label: 'Ogni 15 Giorni', description: '2 volte al mese',    emoji: '📆', iconName: 'calendar-range', iconLib: 'mci', intervalDays: 14 },
  { id: 'monthly',  label: 'Ogni Mese',      description: '1 volta al mese',     emoji: '🗓️', iconName: 'calendar-month', iconLib: 'mci', intervalDays: 30 },
];
