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
