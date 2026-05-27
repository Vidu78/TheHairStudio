import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../config/supabase';
import { ADMIN_CREDENTIALS, BARBERS } from '../data/appData';
import { sendBookingEmail, sendCancellationEmail, sendWelcomeEmail } from '../utils/emailService';

const AppContext = createContext();

// Pulisce eventuale cache ths_session_cache residua da versioni precedenti.
// Ora la session è gestita ESCLUSIVAMENTE da Supabase (localStorage 'sb-*').
try { localStorage.removeItem('ths_session_cache'); } catch (_) {}
try { localStorage.removeItem('ths_cred_cache');    } catch (_) {}

export const AppProvider = ({ children }) => {
  // Stato iniziale sempre "non loggato": l'auth state verrà ricostruito da
  // onAuthStateChange leggendo la session reale di Supabase al boot.
  const [isLoggedIn, setIsLoggedIn]   = useState(false);
  const [isAdmin, setIsAdmin]         = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [bookings, setBookings]       = useState([]);
  const [periodicBookings, setPeriodicBookings] = useState([]);
  const [users, setUsers]             = useState([]);
  const [barbers, setBarbers]         = useState(
    BARBERS.map(b => ({ ...b, onVacation: false, photoOverride: null }))
  );
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]         = useState(true);
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
    // Single source of truth: la session di Supabase + validazione server-side via getUser.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (session?.user) {
          await applySession(session);
        } else {
          // Nessuna session: logout completo (vale per SIGNED_OUT, INITIAL_SESSION senza session, ecc.)
          setIsLoggedIn(false);
          setIsAdmin(false);
          setCurrentUser(null);
        }

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
      setCurrentUser({ id: session.user.id, name: 'Admin', email, role: 'admin' });
      return { id: session.user.id, name: 'Admin', email, role: 'admin' };
    }

    let profile = null;
    try {
      const profileResult = await Promise.race([
        supabase.from('profiles').select('*').eq('user_id', session.user.id).single(),
        new Promise((_, r) => setTimeout(() => r(new Error('profile_timeout')), 3000)),
      ]);
      profile = profileResult?.data;
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
    return user;
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
        // TUTTE le prenotazioni (incluse le occorrenze periodiche) finiscono in `bookings`
        // così il calendario admin le mostra correttamente.
        const all = data.map(mapBooking);
        setBookings(all);

        // periodicBookings = una riga sintetica per ogni "serie" attiva
        // (raggruppata per cliente + frequenza + barbiere + servizio + orario).
        // Una serie è "attiva" se ha almeno un'occorrenza futura non cancellata.
        const todayStr = new Date().toISOString().slice(0, 10);
        const seriesMap = new Map();
        all.forEach(b => {
          if (!b.isPeriodic) return;
          if (b.status === 'cancelled') return;
          if (b.date < todayStr) return;
          const key = `${b.clientId || b.clientName}__${b.frequency}__${b.barber}__${b.service}__${b.time}`;
          if (!seriesMap.has(key)) {
            const periodLabel = b.frequency === 'weekly'   ? 'Ogni Settimana'
                              : b.frequency === 'biweekly' ? 'Ogni 15 Giorni'
                              : b.frequency === 'monthly'  ? 'Ogni Mese'
                              : 'Periodica';
            seriesMap.set(key, {
              id:           `series-${key}`,
              clientId:     b.clientId,
              clientName:   b.clientName,
              service:      b.service,
              barber:       b.barber,
              time:         b.time,
              price:        b.price,
              slots:        b.slots,
              frequency:    b.frequency,
              periodType:   b.frequency,
              periodLabel,
              isPeriodic:   true,
              active:       true,
              nextDates:    [],
              occurrenceIds: [],
            });
          }
          const series = seriesMap.get(key);
          series.nextDates.push(b.date);
          series.occurrenceIds.push(b.id);
        });
        setPeriodicBookings(Array.from(seriesMap.values()));
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
    slots:      b.slots ?? 1,
    status:     b.status,
    isPeriodic: b.is_periodic,
    frequency:  b.periodic_frequency,
  });

  // ─── AUTH ─────────────────────────────────────────────────────────────────
  const loginAdmin = async (email, password) => {
    const emailLow = email.trim().toLowerCase();
    if (emailLow !== ADMIN_CREDENTIALS.email.toLowerCase()) return false;
    try {
      const result = await Promise.race([
        supabase.auth.signInWithPassword({ email: emailLow, password: password.trim() }),
        new Promise((_, r) => setTimeout(() => r(new Error('sb_timeout')), 8000)),
      ]);
      const { data, error } = result;
      if (error || !data?.user) return false;
      // Applica la session IMMEDIATAMENTE: non aspettare onAuthStateChange,
      // così quando ritorniamo true lo state isAdmin/isLoggedIn è già aggiornato.
      if (data.session) {
        try { await applySession(data.session); } catch (_) {}
      }
      return true;
    } catch (_) {
      return false;
    }
  };

  const loginUser = async (email, password) => {
    const emailLow = email.trim().toLowerCase();
    try {
      const result = await Promise.race([
        supabase.auth.signInWithPassword({ email: emailLow, password: password.trim() }),
        new Promise((_, r) => setTimeout(() => r(new Error('sb_timeout')), 8000)),
      ]);
      const { data, error } = result;
      if (error) {
        const msg = error.message?.toLowerCase() ?? '';
        if (msg.includes('email not confirmed') || msg.includes('email_not_confirmed')) return 'unconfirmed';
        return false;
      }
      if (data?.user) {
        // Applica la session SUBITO: garantisce che currentUser/isLoggedIn
        // siano popolati prima del navigate() del LoginScreen.
        if (data.session) {
          try { await applySession(data.session); } catch (_) {}
        }
        return true;
      }
      return false;
    } catch (_) {
      return false; // timeout o rete
    }
  };

  // Ritorna true se ok, 'confirm' se serve conferma email, false se errore
  const registerUser = async (name, email, phone, password) => {
    const emailLow = email.trim().toLowerCase();
    const passTrim = password.trim();
    // Pulisce qualsiasi session residua prima del signUp (evita conflitti con account cancellati lato Dashboard)
    try { await supabase.auth.signOut(); } catch (_) {}
    try {
      const result = await Promise.race([
        supabase.auth.signUp({ email: emailLow, password: passTrim }),
        new Promise((_, r) => setTimeout(() => r(new Error('sb_timeout')), 8000)),
      ]);
      const { data, error } = result;
      if (error) return false;

      // Salva profilo
      if (data?.user?.id) {
        try {
          await supabase.from('profiles').insert({
            user_id: data.user.id,
            name:    name.trim(),
            email:   emailLow,
            phone:   phone.trim(),
            role:    'user',
          });
        } catch (_) {}
      }

      // Invia email di benvenuto (fire-and-forget)
      sendWelcomeEmail({ to_email: emailLow, client_name: name.trim() });

      // Garantisce una sessione attiva facendo signIn esplicito subito dopo il signUp.
      // Se Confirm Email è OFF su Supabase questo funziona; altrimenti ritorna error "email not confirmed".
      try {
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: emailLow, password: passTrim,
        });
        if (!loginError && loginData?.session?.user?.id) {
          const user = { id: loginData.session.user.id, name: name.trim(), email: emailLow, phone: phone.trim(), role: 'user' };
          setIsAdmin(false);
          setIsLoggedIn(true);
          setCurrentUser(user);
          return true;
        }
      } catch (_) {}

      // Fallback: se signUp aveva già restituito una session valida la usiamo
      if (data?.session?.user?.id) {
        const user = { id: data.session.user.id, name: name.trim(), email: emailLow, phone: phone.trim(), role: 'user' };
        setIsAdmin(false);
        setIsLoggedIn(true);
        setCurrentUser(user);
        return true;
      }

      // Email da confermare → non loggiamo, segnaliamo al caller
      return 'confirm';
    } catch (_) {
      return false;
    }
  };

  const logout = async () => {
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
    console.log('[addBooking] start', booking);
    // Legge la session con timeout di sicurezza: se getSession si blocca,
    // sblocchiamo dopo 3s e proviamo comunque (il JWT eventualmente sara' verificato dall'INSERT)
    let sess = null;
    try {
      const sessResult = await Promise.race([
        supabase.auth.getSession(),
        new Promise((_, r) => setTimeout(() => r(new Error('getSession_timeout')), 3000)),
      ]);
      sess = sessResult?.data;
    } catch (err) {
      console.warn('[addBooking] getSession fallito/timeout:', err?.message);
    }
    const authUserId = sess?.session?.user?.id ?? null;
    console.log('[addBooking] authUserId =', authUserId);
    if (!authUserId) {
      throw new Error('Devi effettuare l\'accesso prima di prenotare.');
    }

    // Regola business: ogni cliente puo' avere UNA SOLA prenotazione attiva per giorno.
    // L'admin (isAdmin) e' esentato per poter prenotare a nome di clienti diversi.
    if (!isAdmin) {
      const sameDayActive = bookings.find(b =>
        b.clientId === authUserId &&
        b.date === booking.date &&
        b.status !== 'cancelled'
      );
      if (sameDayActive) {
        throw new Error(`Hai già una prenotazione attiva per il ${booking.date} alle ${sameDayActive.time} (${sameDayActive.service}). Annullala prima di prenotarne un'altra per lo stesso giorno.`);
      }
      // Regola business: se hai una prenotazione PERIODICA attiva (vincolo annuale),
      // non puoi prenotare altri servizi finché non la disattivi.
      const activeSeries = periodicBookings.find(p => p.clientId === authUserId && p.active !== false);
      if (activeSeries) {
        throw new Error(`Hai una prenotazione periodica attiva (${activeSeries.periodLabel} — ${activeSeries.service} con ${activeSeries.barber}). La periodica ha durata annuale: per prenotare altri servizi devi prima disattivarla dal tuo Profilo.`);
      }
    }

    const emailParams = {
      to_email:    sess?.session?.user?.email || currentUser?.email || booking.clientEmail || '',
      client_name: booking.clientName,
      barber:      booking.barber,
      service:     booking.service,
      date:        booking.date,
      time:        booking.time,
      price:       booking.price,
    };
    console.log('[addBooking] INSERT start');
    const result = await Promise.race([
      supabase.from('bookings').insert({
        client_name: booking.clientName,
        client_id:   authUserId,
        service:     booking.service,
        date:        booking.date,
        time:        booking.time,
        barber:      booking.barber,
        price:       booking.price,
        slots:       booking.slots ?? 1,
        status:      'pending',
        is_periodic: false,
      }).select().single(),
      new Promise((_, r) => setTimeout(() => r(new Error('sb_timeout')), 8000)),
    ]);
    console.log('[addBooking] INSERT result:', { data: result?.data, error: result?.error });
    const { data, error } = result;
    if (error) {
      // Sessione orfana: il JWT punta a un auth.users.id cancellato manualmente.
      // Forziamo signOut così l'utente può rifare login con uno stato pulito.
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('foreign key') || msg.includes('bookings_client_id_fkey') || msg.includes('jwt')) {
        try { await supabase.auth.signOut(); } catch (_) {}
        setIsLoggedIn(false);
        setIsAdmin(false);
        setCurrentUser(null);
        throw new Error('La tua sessione non è più valida. Effettua di nuovo l\'accesso.');
      }
      throw error;
    }
    const nb = mapBooking(data);
    setBookings(prev => [nb, ...prev]);
    sendBookingEmail(emailParams);
    return nb;
  };

  // Helpers periodica ─────────────────────────────────────────────────────
  // Verifica se l'utente corrente ha almeno una occorrenza periodica futura attiva.
  // Ritorna la serie attiva (o null se non ne ha).
  const hasActivePeriodic = (clientId) => {
    if (!clientId) return null;
    return periodicBookings.find(p => p.clientId === clientId && p.active !== false) || null;
  };

  // Genera tutte le date di una serie periodica per `durationDays` giorni a partire da `startFrom`.
  // Salta lunedì (chiuso) e domenica (chiuso). Per "monthly" usa mese+1 ricorsivo,
  // per weekly/biweekly aggiunge intervalDays.
  const generatePeriodicDates = (startFromDate, frequency, durationDays = 365) => {
    const intervalMap = { weekly: 7, biweekly: 14, monthly: 30 };
    const result = [];
    const limit = new Date(startFromDate);
    limit.setDate(limit.getDate() + durationDays);

    let current = new Date(startFromDate);
    // Sposta al primo giorno disponibile (no lun/dom)
    let safety = 0;
    while (current.getDay() === 0 || current.getDay() === 1) {
      current.setDate(current.getDate() + 1);
      if (++safety > 7) break;
    }

    while (current <= limit) {
      result.push(new Date(current));
      const next = new Date(current);
      if (frequency === 'monthly') {
        next.setMonth(next.getMonth() + 1);
      } else {
        next.setDate(next.getDate() + (intervalMap[frequency] || 7));
      }
      // Salta lun/dom
      safety = 0;
      while (next.getDay() === 0 || next.getDay() === 1) {
        next.setDate(next.getDate() + 1);
        if (++safety > 7) break;
      }
      current = next;
    }
    return result;
  };

  const addPeriodicBooking = async (periodicBooking) => {
    const clientId   = periodicBooking.clientId || currentUser?.id || null;
    const clientName = periodicBooking.clientName || currentUser?.name || 'Ospite';
    const frequency  = periodicBooking.frequency || periodicBooking.periodType;
    const startDate  = periodicBooking.startDate ? new Date(periodicBooking.startDate) : new Date();
    // Inizio: almeno 3 giorni nel futuro per dare margine al cliente
    if (!periodicBooking.startDate) startDate.setDate(startDate.getDate() + 3);

    // 1 anno di occorrenze
    const dates = generatePeriodicDates(startDate, frequency, 365);
    if (dates.length === 0) {
      throw new Error('Impossibile generare le date della prenotazione periodica.');
    }

    // Prepara le righe da inserire
    const rows = dates.map(d => ({
      client_name:        clientName,
      client_id:          clientId,
      service:            periodicBooking.service,
      date:               d.toISOString().slice(0, 10),
      time:               periodicBooking.time,
      barber:             periodicBooking.barber,
      price:              periodicBooking.price,
      slots:              periodicBooking.slots || 1,
      status:             'confirmed',
      is_periodic:        true,
      periodic_frequency: frequency,
    }));

    // INSERT batch — se Supabase fallisce, salviamo comunque la "serie" sintetica in locale
    try {
      const result = await Promise.race([
        supabase.from('bookings').insert(rows).select(),
        new Promise((_, r) => setTimeout(() => r(new Error('sb_timeout')), 10000)),
      ]);
      const { data, error } = result;
      if (!error && data) {
        const mapped = data.map(mapBooking);
        setBookings(prev => [...mapped, ...prev]);
        // Refetch per ricostruire periodicBookings dalla nuova lista
        fetchBookings();
        return { active: true, count: mapped.length };
      }
      if (error) throw error;
    } catch (e) {
      console.warn('[addPeriodicBooking] errore insert batch:', e?.message);
      throw e;
    }
    return null;
  };

  // Cancella TUTTE le occorrenze future di una serie periodica per il cliente.
  // `seriesKey` può essere o la riga `series` ritornata da periodicBookings,
  // oppure { clientId, frequency, barber, service, time }.
  const cancelPeriodicSeries = async (series) => {
    const clientId  = series.clientId;
    const frequency = series.frequency;
    const barber    = series.barber;
    const service   = series.service;
    const time      = series.time;
    if (!clientId || !frequency) return false;

    const todayStr = new Date().toISOString().slice(0, 10);

    try {
      // Cancella sul DB tutte le occorrenze future di questa serie
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('client_id', clientId)
        .eq('is_periodic', true)
        .eq('periodic_frequency', frequency)
        .eq('barber', barber)
        .eq('service', service)
        .eq('time', time)
        .gte('date', todayStr);
      if (error) throw error;
    } catch (e) {
      console.warn('[cancelPeriodicSeries] errore update DB:', e?.message);
    }

    // Aggiorna lo state locale
    setBookings(prev => prev.map(b => {
      if (!b.isPeriodic) return b;
      if (b.clientId !== clientId) return b;
      if (b.frequency !== frequency) return b;
      if (b.barber !== barber || b.service !== service || b.time !== time) return b;
      if (b.date < todayStr) return b;
      return { ...b, status: 'cancelled' };
    }));
    // Ricostruisce periodicBookings
    fetchBookings();
    return true;
  };

  const updateBookingStatus = async (bookingId, status) => {
    // .select() ritorna le righe modificate: 0 righe = RLS ha silenziosamente rifiutato l'update
    const { data, error } = await supabase.from('bookings').update({ status }).eq('id', bookingId).select();
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('Permessi insufficienti: questa prenotazione non e\' modificabile dal tuo utente.');
    }
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b));
  };

  const cancelBooking = async (bookingId) => {
    const cancelled = bookings.find(b => b.id === bookingId);
    const { data, error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId).select();
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('Permessi insufficienti: questa prenotazione non e\' annullabile dal tuo utente.');
    }
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
    const up = {};
    if (updates.date)   up.date   = updates.date;
    if (updates.time)   up.time   = updates.time;
    if (updates.barber) up.barber = updates.barber;
    if (updates.status) up.status = updates.status;
    const { data, error } = await supabase.from('bookings').update(up).eq('id', bookingId).select();
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('Permessi insufficienti: questa prenotazione non e\' modificabile dal tuo utente.');
    }
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
      hasActivePeriodic, cancelPeriodicSeries,
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
