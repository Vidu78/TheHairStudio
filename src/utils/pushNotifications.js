import { Platform } from 'react-native';

export async function requestPushPermission() {
  if (Platform.OS !== 'web') return false;
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function isPushSupported() {
  return Platform.OS === 'web' && 'Notification' in window;
}

export function getPushPermissionStatus() {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

export function sendLocalNotification(title, body) {
  if (!isPushSupported() || Notification.permission !== 'granted') return;
  new Notification(title, {
    body,
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag: 'thehairstudio',
  });
}

export function notifyNuovaPrenotazione(clientName, service, date, time) {
  sendLocalNotification(
    '📅 Nuova prenotazione',
    `${clientName} — ${service} il ${date} alle ${time}`,
  );
}

export function notifyCancellazione(clientName, service, date, time) {
  sendLocalNotification(
    '❌ Prenotazione annullata',
    `${clientName} ha annullato ${service} del ${date} alle ${time}`,
  );
}
