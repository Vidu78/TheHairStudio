import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../config/supabase';
import { ADMIN_CREDENTIALS, BARBERS } from '../data/appData';
import { sendBookingEmail, sendCancellationEmail, sendWelcomeEmail } from '../utils/emailService';

const AppContext = createContext();

// ─── Session cache + credential cache (web) ──────────────────────────────────
// SESSION_KEY: profilo utente persistito per evitare re-login ad ogni hot-reload.
// CRED_KEY: credenziali offuscate (btoa) usate come fallback quando Supabase è in pausa.
const SESSION_KEY = 'ths_session_cache';
const CRED_KEY    = 'ths_cred_cache';

const _saveCache     = (user) => { try { localStorage.setItem(SESSION_KEY, JSON.stringify(user)); } catch(_) {} };
const _loadCache     = () => { try { const r = localStorage.getItem(SESSION_KEY); return r ? JSON.parse(r) : null; } catch(_) { return null; } };
const _clearCache    = () => { try { localStorage.removeItem(SESSION_KEY); } catch(_) {} };

const _saveCredCache  = (email, password) => { try { localStorage.setItem(CRED_KEY, btoa(JSON.stringify({ e: email, p: password }))); } catch(_) {} };
const _checkCredCache = (email, password) => { try { const raw = localStorage.getItem(CRED_KEY); if (!raw) return false; const { e, p } = JSON.parse(atob(raw)); return e === email && p === password; } catch(_) { return false; } };
const _clearCredCache = () => { try { localStorage.removeItem(CRED_KEY); } catch(_) {} };

export const AppProvider = ({ children }) => {
  // Leggiamo subito la cache: se l'utente era già loggato, partiamo già autenticati
  const _cached = _loadCache();
  const [isLoggedIn, setIsLoggedIn]   = useState(_cached != null);
  const [isAdmin, setIsAdmin]         = useState(_cached?.role === 'admin');
  const [currentUser, setCurrentUser] = useState(_cached);
  const [bookings, setBookings]       = useState([]);
  const [periodicBookings, setPeriodicBookings] = useState([]);
  const [users, setUsers]             = useState([]);
  const [barbers, setBarbers]         = useState(
    BARBERS.map(b => ({ ...b, onVacation: false, photoOverride: null }))
  );
  const [notifications, setNotifications] = useState([]);
  // Se c'è la cache non blocchiamo la navigazione mentre Supabase risponde
  const [loading, setLoading]         = useState(_cached == null);
  const [pageViews, setPageViews]     = useState(0);
  const channelRef = useRef(null);

  // ─── INIT: ripristina sessione + ascolta cambi auth ───────────────────────
  useEffect(() => {
    let mounted = true;

    // Timeout di sicurezza: dopo 6s forza loading=false
    const safetyTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 6000);

    // Supabase v2 emette INITIAL_SESSION all'avvio (con o senza sessione attiva).
    // Gestiamo qui tutti gli eventi rilevanti invece di usare getSession().
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (session?.user) {
          await applySession(session);
        } else if (event === 'SIGNED_OUT') {
          // Logout esplicito: azzera tutto
          setIsLoggedIn(false);
          setIsAdmin(false);
          setCurrentUser(null);
          _clearCache();
        } else if (event === 'INITIAL_SESSION') {
          // Nessuna sessione Supabase attiva — se abbiamo la cache locale la manteniamo
          // (Supabase potrebbe essere in pausa o lento); altrimenti forziamo il logout
          if (!_loadCache()) {
            setIsLoggedIn(false);
            setIsAdmin(false);
            setCurrentUser(null);
          }
        }

        // Dopo INITIAL_SESSION sappiamo lo stato → fine loading
        if (event === 'INITIAL_SESSION' && mounted) {
          clearTimeout(safetyTimer);
          setLoading(false);
        }
      }
    );

    fetchBarbers();
    fetchBookings();

    // Realtime subscription (fallisce silenziosamente se la tabella non esiste)
    try {
      channelRef.current = supabase
        .channel('bookings-rt')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, fetchBookings)
        .subscribe();
    } catch (_) {}

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  // Ricostruisce currentUser da una sessione Supabase
  const applySession = async (session) => {
    const email = session.user.email?.toLowerCase() ?? '';

    if (email === ADMIN_CREDENTIALS.email.toLowerCase()) {
      setIsAdmin(true);
      setIsLoggedIn(true);
      setCurrentUser({ name: 'Admin', email, role: 'admin' });
      return;
    }

    let profile = null;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      profile = data;
    } catch (_) {}

    const user = {
      id:        session.user.id,
      client_id: session.user.id,
      name:      profile?.name  ?? email,
      email,
      phone:     profile?.phone ?? '',
      role:      'user',
    };
    setIsAdmin(false);
    setIsLoggedIn(true);
    setCurrentUser(user);
    _saveCache(user);
  };

  // ─── DATA ─────────────────────────────────────────────────────────────────
  const fetchBarbers = async () => {
    try {
      const { data, error } = await supabase.from('barbers').select('*').order('id');
      if (!error && data && data.length > 0) {
        setBarbers(data.map(b => ({
          id:          String(b.id),
          name:        b.name,
          surname:     b.surname    || '',
          role:        b.role       || 'Barbiere',
          avatar:      b.avatar     || '✂️',
          speciality:  b.speciality || '',
          onVacation:  b.on_vacation || false,
          photoOverride: b.photo_url || null,
        })));
      }
    } catch (_) {}
  };

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('date', { ascending: true })
        .order('time', { ascending: true });
      if (!error && data) {
        setBookings(data.filter(b => !b.is_periodic).map(mapBooking));
        setPeriodicBookings(data.filter(b => b.is_periodic).map(mapBooking));
      }
    } catch (_) {}
  };

  const mapBooking = (b) => ({
    id:         String(b.id),
    clientName: b.client_name,
    clientId:   b.client_id,
    service:    b.service,
    date:       b.date,
    time:       b.time,
    barber:     b.barber,
    price:      b.price,
    slots:      b.slots || 1,
    status:     b.status,
    isPeriodic: b.is_periodic,
    frequency:  b.periodic_frequency,
  });

  // ─── AUTH ─────────────────────────────────────────────────────────────────
  const loginAdmin = async (email, password) => {
    const emailLow = email.trim().toLowerCase();
    const passTrim = password.trim();

    // Controlla subito il fallback locale: se Supabase è irraggiungibile non aspettiamo
    const isLocalAdmin =
      emailLow === ADMIN_CREDENTIALS.email.toLowerCase() &&
      passTrim  === ADMIN_CREDENTIALS.password;

    // Tenta Supabase con timeout interno di 5s
    try {
      const result = await Promise.race([
        supabase.auth.signInWithPassword({ email: emailLow, password: passTrim }),
        new Promise((_, r) => setTimeout(() => r(new Error('sb_timeout')), 5000)),
      ]);
      const { data, error } = result;
      if (!error && data?.user) {
        const adminUser = { name: 'Admin', email: emailLow, role: 'admin' };
        setIsAdmin(true);
        setIsLoggedIn(true);
        setCurrentUser(adminUser);
        _saveCache(adminUser);
        return true;
      }
    } catch (_) {
      // Supabase timeout o irraggiungibile → usa fallback locale
    }

    // Fallback locale (funziona anche offline / Supabase in pausa)
    if (isLocalAdmin) {
      const adminUser = { name: 'Admin', email: ADMIN_CREDENTIALS.email, role: 'admin' };
      setIsAdmin(true);
      setIsLoggedIn(true);
      setCurrentUser(adminUser);
      _saveCache(adminUser);
      return true;
    }
    return false;
  };

  const loginUser = async (email, password) => {
    const emailLow = email.trim().toLowerCase();
    const passTrim = password.trim();

    // Tentativo Supabase con timeout interno di 5 secondi
    try {
      const result = await Promise.race([
        supabase.auth.signInWithPassword({ email: emailLow, password: passTrim }),
        new Promise((_, r) => setTimeout(() => r(new Error('sb_timeout')), 5000)),
      ]);

      const { data, error } = result;

      if (error) {
        const msg = error.message?.toLowerCase() ?? '';
        if (msg.includes('email not confirmed') || msg.includes('email_not_confirmed')) {
          return 'unconfirmed';
        }
        // Supabase risponde ma le credenziali sono sbagliate → non usare il fallback
        if (msg.includes('invalid') || msg.includes('wrong') || msg.includes('credentials')) {
          return false;
        }
        // Altro errore Supabase → prova il fallback locale
      } else if (data?.user) {
        // ✅ Supabase OK
        let profile = null;
        try {
          const { data: p } = await supabase.from('profiles').select('*').eq('user_id', data.user.id).single();
          profile = p;
        } catch (_) {}

        const user = {
          id:    data.user.id,
          name:  profile?.name  ?? emailLow,
          email: emailLow,
          phone: profile?.phone ?? '',
          role:  'user',
        };
        setIsAdmin(false);
        setIsLoggedIn(true);
        setCurrentUser(user);
        _saveCache(user);
        _saveCredCache(emailLow, passTrim); // salva cred per uso offline
        return true;
      }
    } catch (_) {
      // Supabase irraggiungibile (pausa, timeout, rete) → usa fallback
    }

    // ─── Fallback offline ────────────────────────────────────────────────────
    // Se Supabase non risponde E le credenziali corrispondono alla cache locale
    if (_checkCredCache(emailLow, passTrim)) {
      const cached = _loadCache();
      if (cached && cached.email === emailLow) {
        setIsAdmin(false);
        setIsLoggedIn(true);
        setCurrentUser(cached);
        return true;
      }
    }

    return false;
  };

  // Ritorna true se ok, 'confirm' se serve conferma email, false se errore
  const registerUser = async (name, email, phone, password) => {
    try {
      const result = await Promise.race([
        supabase.auth.signUp({ email: email.trim().toLowerCase(), password: password.trim() }),
        new Promise((_, r) => setTimeout(() => r(new Error('sb_timeout')), 8000)),
      ]);
      const { data, error } = result;

      if (error) return false;

      // Salva profilo
      try {
        await supabase.from('profiles').insert({
          user_id: data.user?.id,
          name:    name.trim(),
          email:   email.trim().toLowerCase(),
          phone:   phone.trim(),
          role:    'user',
        });
      } catch (_) {}

      // Invia email di benvenuto (fire-and-forget)
      sendWelcomeEmail({ to_email: email.trim().toLowerCase(), client_name: name.trim() });

      // Se c'è già una sessione attiva → auto-login
      if (data.session) {
        const user = { id: data.user.id, name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim(), role: 'user' };
        setIsAdmin(false);
        setIsLoggedIn(true);
        setCurrentUser(user);
        _saveCache(user);
        return true;
      }

      // Email da confermare → non loggiamo, segnaliamo al caller
      return 'confirm';
    } catch (_) {
      return false;
    }
  };

  const logout = async () => {
    _clearCache();
    _clearCredCache();
    try { await supabase.auth.signOut(); } catch (_) {}
    setIsLoggedIn(false);
    setIsAdmin(false);
    setCurrentUser(null);
    setBookings([]);
    setPeriodicBookings([]);
    setNotifications([]);
    setUsers([]);
  };

  // ─── BOOKINGS ─────────────────────────────────────────────────────────────
  const addBooking = async (booking) => {
    const emailParams = {
      to_email:    currentUser?.email || booking.clientEmail || '',
      client_name: booking.clientName,
      barber:      booking.barber,
      service:     booking.service,
      date:        booking.date,
      time:        booking.time,
      price:       booking.price,
    };
    try {
      const result = await Promise.race([
        supabase.from('bookings').insert({
          client_name: booking.clientName,
          client_id:   booking.clientId || null,
          service:     booking.service,
          date:        booking.date,
          time:        booking.time,
          barber:      booking.barber,
          price:       booking.price,
          slots:       booking.slots || 1,
          status:      'confirmed',
          is_periodic: false,
        }).select().single(),
        new Promise((_, r) => setTimeout(() => r(new Error('sb_timeout')), 5000)),
      ]);
      const { data, error } = result;
      if (!error && data) {
        const nb = mapBooking(data);
        setBookings(prev => [nb, ...prev]);
        sendBookingEmail(emailParams);
        return nb;
      }
    } catch (_) {}
    const local = { ...booking, id: Date.now().toString(), status: 'confirmed' };
    setBookings(prev => [local, ...prev]);
    sendBookingEmail(emailParams);
    return local;
  };

  const addPeriodicBooking = async (periodicBooking) => {
    try {
      const { data, error } = await supabase.from('bookings').insert({
        client_name:        periodicBooking.clientName,
        service:            periodicBooking.service,
        date:               periodicBooking.startDate || new Date().toISOString().slice(0, 10),
        time:               periodicBooking.time,
        barber:             periodicBooking.barber,
        price:              periodicBooking.price,
        slots:              periodicBooking.slots || 1,
        status:             'confirmed',
        is_periodic:        true,
        periodic_frequency: periodicBooking.frequency,
      }).select().single();
      if (!error && data) {
        const np = { ...mapBooking(data), active: true };
        setPeriodicBookings(prev => [np, ...prev]);
        return np;
      }
    } catch (_) {}
    const local = { ...periodicBooking, id: Date.now().toString(), active: true };
    setPeriodicBookings(prev => [local, ...prev]);
    return local;
  };

  const updateBookingStatus = async (bookingId, status) => {
    try { await supabase.from('bookings').update({ status }).eq('id', bookingId); } catch (_) {}
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b));
  };

  const cancelBooking = async (bookingId) => {
    const cancelled = bookings.find(b => b.id === bookingId);
    try { await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId); } catch (_) {}
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b));
    if (cancelled) {
      setNotifications(prev => [{
        id:         Date.now().toString(),
        type:       'cancellation',
        bookingId,
        clientName: cancelled.clientName,
        service:    cancelled.service,
        date:       cancelled.date,
        time:       cancelled.time,
        barber:     cancelled.barber,
        price:      cancelled.price,
        timestamp:  new Date().toISOString(),
        read:       false,
      }, ...prev]);

      // Se è l'admin a cancellare, recupera l'email del cliente dal profilo
      let clientEmail = currentUser?.email || '';
      if (isAdmin && cancelled.clientId) {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('email')
            .eq('user_id', cancelled.clientId)
            .single();
          if (data?.email) clientEmail = data.email;
        } catch (_) {}
      }

      sendCancellationEmail({
        to_email:    clientEmail,
        client_name: cancelled.clientName,
        barber:      cancelled.barber,
        service:     cancelled.service,
        date:        cancelled.date,
        time:        cancelled.time,
      });
    }
  };

  const markNotificationRead = (notifId) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const updateBooking = async (bookingId, updates) => {
    try {
      const up = {};
      if (updates.date)   up.date   = updates.date;
      if (updates.time)   up.time   = updates.time;
      if (updates.barber) up.barber = updates.barber;
      if (updates.status) up.status = updates.status;
      await supabase.from('bookings').update(up).eq('id', bookingId);
    } catch (_) {}
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, ...updates } : b));
  };

  // ─── BARBIERI ─────────────────────────────────────────────────────────────
  const setBarberVacation = async (barberId, onVacation) => {
    try { await supabase.from('barbers').update({ on_vacation: onVacation }).eq('id', barberId); } catch (_) {}
    setBarbers(prev => prev.map(b => b.id === barberId ? { ...b, onVacation } : b));
  };

  const updateBarberPhoto = async (barberId, photoUri) => {
    try { await supabase.from('barbers').update({ photo_url: photoUri }).eq('id', barberId); } catch (_) {}
    setBarbers(prev => prev.map(b => b.id === barberId ? { ...b, photoOverride: photoUri } : b));
  };

  const addNotification = (userId, message) => {
    const notif = { id: Date.now().toString(), userId, message, timestamp: new Date().toISOString(), read: false };
    setNotifications(prev => [notif, ...prev]);
    return notif;
  };

  const incrementPageViews = () => setPageViews(prev => prev + 1);

  return (
    <AppContext.Provider value={{
      isLoggedIn, isAdmin, currentUser, loading,
      bookings, periodicBookings, users, barbers, notifications, pageViews,
      loginAdmin, loginUser, registerUser, logout,
      addBooking, addPeriodicBooking,
      updateBookingStatus, cancelBooking, updateBooking,
      setBarberVacation, updateBarberPhoto,
      addNotification, markNotificationRead, markAllNotificationsRead,
      incrementPageViews, fetchBookings,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
