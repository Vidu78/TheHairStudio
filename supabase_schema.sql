-- ═══════════════════════════════════════════════════════════════
-- THE HAIR STUDIO — Schema Supabase
-- Esegui questo script su: app.supabase.com → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Profili utenti ────────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null unique,
  name       text not null,
  email      text not null,
  phone      text default '',
  role       text default 'user',
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Utenti vedono solo il proprio profilo"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Utenti modificano solo il proprio profilo"
  on public.profiles for all
  using (auth.uid() = user_id);

-- ── 2. Prenotazioni ──────────────────────────────────────────────
create table if not exists public.bookings (
  id                 bigint primary key generated always as identity,
  client_name        text not null,
  client_id          uuid references auth.users(id) on delete set null,
  service            text not null,
  date               date not null,
  time               text not null,
  barber             text not null,
  price              numeric(8,2) not null default 0,
  slots              int default 1,
  status             text default 'confirmed',    -- confirmed | pending | cancelled
  is_periodic        boolean default false,
  periodic_frequency text,                        -- weekly | biweekly | monthly
  created_at         timestamptz default now()
);

alter table public.bookings enable row level security;

-- Utenti vedono solo le proprie prenotazioni
create policy "Utenti vedono le proprie prenotazioni"
  on public.bookings for select
  using (auth.uid() = client_id);

-- Utenti possono creare prenotazioni
create policy "Utenti possono prenotare"
  on public.bookings for insert
  with check (auth.uid() = client_id or client_id is null);

-- Utenti possono aggiornare (es. annullare) le proprie
create policy "Utenti possono aggiornare le proprie prenotazioni"
  on public.bookings for update
  using (auth.uid() = client_id);

-- Admin (service role) può fare tutto — si attiva dal backend
create policy "Lettura pubblica per disponibilità orari"
  on public.bookings for select
  using (status != 'cancelled');

-- ── 3. Barbieri ──────────────────────────────────────────────────
create table if not exists public.barbers (
  id          int primary key,
  name        text not null,
  surname     text default '',
  role        text default 'Barbiere',
  avatar      text default '✂️',
  speciality  text default '',
  on_vacation boolean default false,
  photo_url   text
);

alter table public.barbers enable row level security;

create policy "Tutti possono leggere i barbieri"
  on public.barbers for select using (true);

-- Inserisci i barbieri iniziali
insert into public.barbers (id, name, surname, role, avatar, speciality, on_vacation)
values
  (1, 'Angelo',   '', 'Maestro',   '👑', 'Taglio & Barba',    false),
  (2, 'Pietro',   '', 'Barbiere',  '✂️', 'Taglio Classico',   false),
  (3, 'Domenico', '', 'Barbiere',  '💈', 'Barba & Styling',   false)
on conflict (id) do nothing;

-- ── 4. Funzione per Admin — accesso completo alle prenotazioni ───
-- Esegui come service_role nel backend (non nel client)
-- Usa la Supabase Dashboard > Authentication > Hooks per l'admin

-- ── 5. Indici per performance ────────────────────────────────────
create index if not exists idx_bookings_date    on public.bookings(date);
create index if not exists idx_bookings_barber  on public.bookings(barber);
create index if not exists idx_bookings_client  on public.bookings(client_id);
create index if not exists idx_profiles_user_id on public.profiles(user_id);
