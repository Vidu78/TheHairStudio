-- ── 1. Colonna rating su bookings ───────────────────────────────
alter table public.bookings
  add column if not exists rating smallint check (rating between 1 and 5);

-- ── 2. Tabella chiusure/ferie programmate ────────────────────────
create table if not exists public.calendar_blocks (
  id          uuid        default gen_random_uuid() primary key,
  date        date        not null,
  barber_name text,        -- null = chiusura per tutti
  reason      text        default 'Chiusura',
  created_at  timestamptz default now()
);

alter table public.calendar_blocks enable row level security;

create policy "Lettura pubblica chiusure"
  on public.calendar_blocks for select
  using (true);

create policy "Admin gestisce chiusure"
  on public.calendar_blocks for all
  using (true);

create index if not exists idx_calendar_blocks_date
  on public.calendar_blocks(date);
