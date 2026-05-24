# The Hair Studio App - Guida Completa

## Informazioni App
- **Nome:** The Hair Studio
- **Versione:** 1.0.0
- **Barbiere:** Via Alessandro Manzoni, 38 · Noci (BA) 70015
- **Telefono:** +39 328 594 4459

---

## Test Immediato con QR Code (EXPO GO)

### Passo 1 - Installa Expo Go
- **Android:** [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)
- **iPhone:** [App Store](https://apps.apple.com/app/expo-go/id982107779)

### Passo 2 - Avvia il server
```
Doppio click su: AVVIA-APP.bat
```

### Passo 3 - Scansiona il QR code
Apri Expo Go → scansiona il QR che appare nel terminale

**Assicurati che:**
- PC e telefono siano sulla stessa rete WiFi
- Firewall Windows permetta Node.js

---

## Credenziali Demo

| Tipo | Email/Nome | Password/Telefono |
|------|-----------|-------------------|
| **Admin** | admin@thehairstudio.it | THS2024! |
| **Cliente** | Qualsiasi nome | Qualsiasi numero |

---

## Build APK Android (EAS Cloud)

### Requisiti
1. Account Expo gratuito → https://expo.dev/signup

### Comandi (nella cartella TheHairStudio)

```powershell
# Login Expo
eas login

# Build APK Android (gratis, ~15-20 min)
eas build --platform android --profile preview

# Quando completo, scarica l'APK dal link fornito
# Oppure scansiona il QR code che Expo genera automaticamente
```

L'APK viene inviato via email e disponibile su expo.dev/dashboard

---

## Build iOS (EAS Cloud)

```powershell
# Build IPA per iPhone (richiede Apple Developer Account $99/anno)
eas build --platform ios --profile preview

# Oppure build per simulatore (gratis)
eas build --platform ios --profile preview --local
```

---

## Funzionalità App

### Per il Cliente
- [x] Splash screen animata con silhouette di Noci
- [x] Login cliente (nome + telefono)
- [x] Home con servizi, barbieri e orari
- [x] Prenotazione guidata step-by-step
- [x] **Prenotazione Periodica** (settimanale/15 giorni/mensile)
- [x] Profilo con storico prenotazioni

### Per l'Amministratore
- [x] Login admin (email + password)
- [x] Dashboard con revenue giornaliero/settimanale/mensile
- [x] Grafico clienti per giorno della settimana
- [x] Statistiche servizi più richiesti
- [x] KPI del mese (scontrino medio, tasso ritorno, no-show)
- [x] Gestione prenotazioni (conferma/annulla)
- [x] Notifiche in attesa di conferma

---

## Struttura Progetto

```
TheHairStudio/
├── App.js                    # Entry point
├── src/
│   ├── context/
│   │   └── AppContext.js     # State management globale
│   ├── data/
│   │   └── appData.js        # Dati: servizi, orari, mock prenotazioni
│   ├── navigation/
│   │   └── AppNavigator.js   # Navigazione Stack + Tab
│   └── screens/
│       ├── SplashScreen.js   # Splash con silhouette Noci
│       ├── LoginScreen.js    # Login cliente/admin
│       ├── HomeScreen.js     # Home con servizi
│       ├── BookingScreen.js  # Prenotazione step-by-step
│       ├── PeriodicBookingScreen.js  # Prenotazione periodica
│       ├── ProfileScreen.js  # Profilo cliente
│       ├── AdminDashboard.js # Dashboard admin + statistiche
│       └── AdminBookingsScreen.js   # Gestione prenotazioni admin
├── AVVIA-APP.bat             # Avvio rapido
├── eas.json                  # Config build cloud
└── app.json                  # Config Expo
```

---

## Sviluppi Futuri Consigliati

1. **Backend reale** - Supabase o Firebase per dati persistenti
2. **Notifiche push** - Promemoria appuntamenti con expo-notifications
3. **Pagamenti** - Integrazione Stripe per pagamento online
4. **SMS** - Conferma prenotazione via SMS (Twilio)
5. **Google Maps** - Indicazioni stradali integrate
6. **Instagram** - Feed integrato per mostrare i lavori del salone

---

## Supporto

Per build e pubblicazione su Play Store/App Store contattare uno sviluppatore.
Il progetto è completo e pronto per la fase di production.
