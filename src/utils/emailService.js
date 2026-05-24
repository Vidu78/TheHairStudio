// ─── EmailJS — configurazione produzione ─────────────────────────────────────
// SETUP (una tantum, 5 minuti):
// 1. Vai su https://emailjs.com → crea account gratuito (200 email/mese)
// 2. Email Services → Add Service → Gmail → connetti thehair.studio@gmail.com → copia Service ID
// 3. Email Templates → Create Template → incolla il template qui sotto → copia Template ID
// 4. Account → API Keys → copia Public Key
//
// TEMPLATE DA USARE SU EMAILJS (copia nel campo "Content"):
// Subject: ✂️ Prenotazione confermata - The Hair Studio
// Body:
//   Ciao {{client_name}},
//   La tua prenotazione è confermata!
//   📋 Servizio: {{service}}
//   💈 Barbiere: {{barber}}
//   📅 Data: {{date}}
//   🕐 Orario: {{time}}
//   💶 Totale: €{{price}}
//   📍 Via Alessandro Manzoni, 38 – Noci (BA)
//   📞 +39 328 594 4459
//   Ti aspettiamo! — The Hair Studio
// ─────────────────────────────────────────────────────────────────────────────

const EMAILJS_SERVICE_ID        = 'service_rjzldse';   // ✅ configurato
const EMAILJS_TEMPLATE_ID       = 'template_giquqpi';  // ✅ Order Confirmation
const EMAILJS_WELCOME_TEMPLATE  = 'template_7f7rhrr';  // ✅ Welcome (registrazione)
const EMAILJS_PUBLIC_KEY        = 'WHveQi3w8PoTFnYkN'; // ✅ già configurato

export const sendBookingEmail = async ({ to_email, client_name, barber, service, date, time, price }) => {
  if (!to_email) return false;
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID) {
    console.warn('[EmailJS] Chiavi non configurate');
    return false;
  }

  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id:      EMAILJS_SERVICE_ID,
        template_id:     EMAILJS_TEMPLATE_ID,
        user_id:         EMAILJS_PUBLIC_KEY,
        template_params: { to_email, client_name, barber, service, date, time, price, order_id: `${date}-${time}` },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
};

export const sendWelcomeEmail = async ({ to_email, client_name }) => {
  if (!to_email || !EMAILJS_SERVICE_ID) return false;
  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id:      EMAILJS_SERVICE_ID,
        template_id:     EMAILJS_WELCOME_TEMPLATE,
        user_id:         EMAILJS_PUBLIC_KEY,
        template_params: { to_email, client_name, name: client_name },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
};

export function buildGoogleCalendarUrl({ date, time, service, barber, slots = 1 }) {
  try {
    const [year, month, day] = date.split('-');
    const [hour, min] = time.split(':');
    const start = new Date(+year, +month - 1, +day, +hour, +min);
    const end   = new Date(start.getTime() + slots * 30 * 60 * 1000);
    const fmt = d =>
      `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}00`;
    const text     = encodeURIComponent(`Appuntamento The Hair Studio — ${service}`);
    const details  = encodeURIComponent(`Barbiere: ${barber}\nServizio: ${service}\nTel: +39 328 594 4459`);
    const location = encodeURIComponent('Via Alessandro Manzoni, 38, Noci BA');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${fmt(start)}/${fmt(end)}&details=${details}&location=${location}`;
  } catch {
    return 'https://calendar.google.com';
  }
}

export const sendConfirmationEmail = async ({ to_email, client_name, barber, service, date, time, price, slots = 1 }) => {
  if (!to_email || !EMAILJS_SERVICE_ID) return false;
  const calendar_url = buildGoogleCalendarUrl({ date, time, service, barber, slots });
  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id:      EMAILJS_SERVICE_ID,
        template_id:     EMAILJS_TEMPLATE_ID,
        user_id:         EMAILJS_PUBLIC_KEY,
        template_params: { to_email, client_name, barber, service, date, time, price, calendar_url, order_id: `${date}-${time}` },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
};

export const sendCancellationEmail = async ({ to_email, client_name, barber, service, date, time }) => {
  if (!to_email || !EMAILJS_SERVICE_ID) return false;
  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id:      EMAILJS_SERVICE_ID,
        template_id:     EMAILJS_TEMPLATE_ID,
        user_id:         EMAILJS_PUBLIC_KEY,
        template_params: {
          to_email, client_name, barber, service, date, time,
          price: 'Annullata',
          cancellation: true,
        },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
};
