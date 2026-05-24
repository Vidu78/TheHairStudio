-- ═══════════════════════════════════════════════════════════════════════════
-- THE HAIR STUDIO - Schema Supabase
-- Esegui questo script su: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── TABELLA PROFILES (utenti registrati) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  email      TEXT,
  phone      TEXT,
  role       TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABELLA BARBERS (barbieri con ferie e foto) ──────────────────────────────
CREATE TABLE IF NOT EXISTS barbers (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  surname     TEXT DEFAULT '',
  role        TEXT DEFAULT 'Barbiere',
  avatar      TEXT DEFAULT '✂️',
  speciality  TEXT DEFAULT '',
  on_vacation BOOLEAN DEFAULT FALSE,
  photo_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABELLA BOOKINGS (prenotazioni singole e periodiche) ─────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name        TEXT NOT NULL,
  client_id          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  service            TEXT NOT NULL,
  date               DATE NOT NULL,
  time               TEXT NOT NULL,
  barber             TEXT NOT NULL,
  price              NUMERIC(10,2) DEFAULT 0,
  slots              INTEGER DEFAULT 1,
  status             TEXT DEFAULT 'pending',
  is_periodic        BOOLEAN DEFAULT FALSE,
  periodic_frequency TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ROW LEVEL SECURITY (disabilita per demo, abilita in produzione) ──────────
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE barbers  DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;

-- ─── DATI INIZIALI BARBIERI ───────────────────────────────────────────────────
INSERT INTO barbers (id, name, role, speciality, avatar, on_vacation) VALUES
  ('1', 'Angelo',   'Maestro',  'Taglio & Barba',    '👑', FALSE),
  ('2', 'Pietro',   'Barbiere', 'Taglio Classico',   '✂️', FALSE),
  ('3', 'Domenico', 'Barbiere', 'Barba & Styling',   '💈', FALSE)
ON CONFLICT (id) DO NOTHING;

-- ─── DATI DEMO PRENOTAZIONI ───────────────────────────────────────────────────
INSERT INTO bookings (client_name, service, date, time, barber, price, slots, status) VALUES
  ('Giovanni D.',  'Taglio + Barba',          '2026-05-26', '09:00', 'Angelo',   18, 2, 'confirmed'),
  ('Antonio M.',   'Taglio',                  '2026-05-26', '09:00', 'Pietro',   13, 1, 'confirmed'),
  ('Francesco P.', 'Barba Classica',          '2026-05-26', '09:00', 'Domenico',  5, 1, 'confirmed'),
  ('Salvatore R.', 'Barba Modellata',         '2026-05-27', '10:30', 'Pietro',    6, 1, 'pending'),
  ('Nicola L.',    'Taglio + Barba + Shampoo','2026-05-27', '11:00', 'Angelo',   23, 2, 'confirmed'),
  ('Michele V.',   'Taglio + Shampoo',        '2026-05-28', '14:00', 'Domenico', 18, 2, 'confirmed'),
  ('Donato C.',    'Taglio',                  '2026-05-28', '09:00', 'Pietro',   13, 1, 'pending');

-- ─── ABILITA REAL-TIME per bookings e barbers ─────────────────────────────────
-- Esegui anche questi comandi separatamente se la tabella non compare in Realtime:
-- Supabase Dashboard → Database → Replication → abilita bookings e barbers
