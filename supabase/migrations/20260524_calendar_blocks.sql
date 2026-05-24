-- Tabella per gestire chiusure e ferie programmate
create table if not exists public.calendar_blocks (
  id          uuid        default gen_random_uuid() primary key,
  date        date        not null,
  barber_name text,       -- null = chiusura per tutti i barbieri
  reason      text        default 'Chiusura',
  created_at  timestamptz default now()
);

alter table public.calendar_blocks enable row level security;

-- Solo admin può scrivere, tutti possono leggere (per slot availability)
create policy "Lettura pubblica chiusure"
  on public.calendar_blocks for select
  using (true);

create policy "Admin gestisce chiusure"
  on public.calendar_blocks for all
  using (true);

-- Indice per query per data
create index if not exists idx_calendar_blocks_date on public.calendar_blocks(date);
