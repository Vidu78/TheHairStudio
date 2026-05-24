# The Hair Studio — CLAUDE.md

## Stack
- **Frontend**: React Native + Expo SDK 54 (iOS / Android / PWA web)
- **Backend**: Supabase (Auth + PostgreSQL + Realtime + Storage)
- **Email**: EmailJS (200 email/mese — template HTML configurati)
- **SMS**: Twilio (da integrare — Supabase Edge Function)
- **Hosting**: Vercel (PWA) + EAS Build (APK Android / IPA iOS)

## Regole di Business
- Slot prenotazione: ogni **30 minuti**
- Taglio: 30 min → **1 slot**
- Taglio + Barba: 45 min → **2 slot** (blocca 12:30 se è l'ultimo slot mattutino)
- Taglio + Shampoo: 60 min → **2 slot**
- Taglio + Barba + Shampoo: 60 min → **2 slot**
- Barba Classica: 30 min → **1 slot**
- Barba Modellata: 30 min → **1 slot**
- Orari: Mar–Ven 08:30–13:00 / 15:00–21:00 · Sabato 08:30–20:30 · Lunedì chiuso
- Max prenotazioni parallele: 3 (Angelo, Pietro, Domenico)
- Cancellazione gratuita entro 2h dalla prenotazione

## Convenzioni Codice
- Componenti React in PascalCase
- Hook personalizzati in camelCase con prefisso `use`
- NON usare `@expo/vector-icons` nei componenti — usare emoji Unicode (sempre visibili su web)
- NON usare proprietà CSS-only in StyleSheet (`objectFit`, `objectPosition`)
- Tutti i testi dell'interfaccia in **italiano**
- Nessun commento al codice salvo logica non ovvia

## Non fare mai
- Hardcodare IDs nel codice
- Modificare lo schema DB senza annotare la migration
- Chiamare `sendBookingEmail` da BookingScreen (già gestita in AppContext.addBooking)
- Usare `if (!fontsLoaded) return null` — causa schermata bianca permanente
- Refactor massivi: procedi in micro-task incrementali

## Deploy
Dopo ogni modifica eseguire **senza chiedere conferma**:
```bash
cd "C:\Users\Vincenzo Durante\Desktop\TheHairStudio"
npm run deploy
```
URL produzione: **https://the-hair-studio.vercel.app**

Lo script `npm run deploy` fa: `expo export -p web → dist/` + `vercel --prod dist --yes`

## Architettura file

```
App.js                          # Entry — useFonts con timeout 3s, nessun blocco render
src/
  config/supabase.js            # Client Supabase (SecureStore native / localStorage web)
  context/AppContext.js         # Stato globale: auth, bookings, barbers, notifiche
  data/appData.js               # SERVICES (con emoji), BARBERS, SALON_INFO, PERIODIC_OPTIONS
  navigation/AppNavigator.js    # Stack + BottomTab (icone tab = emoji, sempre visibili)
  screens/
    SplashScreen.js
    LoginScreen.js              # Login cliente + admin con tab switcher
    RegisterScreen.js
    WelcomeScreen.js
    HomeScreen.js               # Dashboard — servizi con emoji, barbieri, orari
    BookingScreen.js            # Flusso 5 step: Barbiere→Servizio→Data→Orario→Conferma
    PeriodicBookingScreen.js    # Prenotazione ricorrente (settimanale/bisettimanale/mensile)
    ProfileScreen.js            # Profilo cliente + storico prenotazioni
    ContactsScreen.js           # Info sviluppatore (tab "Info App")
    AdminDashboard.js           # Pannello admin: overview, prenotazioni, barbieri, stats
    AdminBookingsScreen.js
  utils/
    emailService.js             # sendBookingEmail · sendWelcomeEmail · sendCancellationEmail
```

## Credenziali servizi

```
Supabase URL:       https://yxlvgeatcgsodsrbakbq.supabase.co
Supabase Anon Key:  sb_publishable_GWPjU0tqGZBB75zzjBJl6w_O_9fFu5J

EmailJS Service ID:        service_rjzldse
EmailJS Template booking:  template_giquqpi   (To Email = {{to_email}})
EmailJS Template welcome:  template_7f7rhrr   (To Email = {{to_email}})
EmailJS Public Key:        WHveQi3w8PoTFnYkN

Admin email:    admin@thehairstudio.it
Admin password: THS2024!

Vercel project: the-hair-studio
```

## Supabase — configurazione auth
- **Email confirmation**: DISABILITATA (Sign In/Providers → Confirm email = OFF)
- **Site URL**: https://the-hair-studio.vercel.app
- **Password reset redirectTo**: https://the-hair-studio.vercel.app

## Supabase — RLS policies attive
```sql
bookings: "Lettura pubblica per disponibilità orari" → status != 'cancelled'
bookings: "Admin vede tutto"                         → USING (true)
```

## Pattern timeout Supabase
```js
const result = await Promise.race([
  supabase.from('bookings').insert({...}).select().single(),
  new Promise((_, r) => setTimeout(() => r(new Error('sb_timeout')), 5000)),
]);
// Timeout: insert/login = 5s · signUp = 8s
```

## Icone — regola critica web
```js
// SBAGLIATO — mostra □ se i font non sono ancora caricati
<Ionicons name="scissors" size={22} color="#C9A84C" />

// CORRETTO — sempre visibile su qualsiasi browser
<Text style={{ fontSize: 22 }}>✂️</Text>
```
Mappa emoji usata:
- Taglio: ✂️  · Barba: 💈  · Shampoo: 🚿  · Premium: 👑
- Prenota: 📅  · Periodica: 🔄  · Profilo: 👤  · Info: ℹ️
- Orario: 🕐  · Telefono: 📞  · Indirizzo: 📍  · Email: 📧

## Salone — dati reali
```
The Hair Studio · Via Alessandro Manzoni, 38 · Noci (BA) 70015
Tel: +39 328 594 4459 · thehair.studio@gmail.com · @thehairstudio_noci
Barbieri: Angelo (Maestro) · Pietro (Barbiere) · Domenico (Barbiere)
```

## Roadmap sviluppi futuri
1. Calendario visivo admin (vista settimana con slot colorati per barbiere)
2. Storico servizi cliente con rating stelle in ProfileScreen
3. SMS reminder Twilio via Supabase Edge Function (24h prima appuntamento)
4. Export CSV prenotazioni dalla dashboard admin
5. Notifiche push PWA (Web Push API + Service Worker)
6. Gestione chiusure/ferie programmate con calendar_blocks
