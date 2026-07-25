-- ============================================================
--  Alcoolic Battle War — Supabase schema complet
--  Exécuter dans : Supabase Dashboard > SQL Editor
--  Safe à relancer : utilise IF NOT EXISTS / OR REPLACE
-- ============================================================

-- 1. Table principale
create table if not exists public.games (
  id                  text        primary key,
  status              text        not null default 'waiting',
  current_turn        text        not null default 'team1',
  winner              text,
  team1_name          text        not null,
  team1_ready         boolean     not null default false,
  team1_ships         jsonb       not null default '[]',
  team2_name          text        not null default '',
  team2_ready         boolean     not null default false,
  team2_ships         jsonb       not null default '[]',
  shots_by_team1      jsonb       not null default '{}',
  shots_by_team2      jsonb       not null default '{}',
  drink_notification  jsonb,
  last_shot           jsonb,
  created_at          bigint      not null
);

-- 2. Colonnes ajoutées en v2 (safe si déjà présentes)
alter table public.games add column if not exists last_shot jsonb;

-- 3. Full row dans le payload Realtime
alter table public.games replica identity full;

-- 4. Realtime (ignore si déjà membre)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'games'
  ) then
    execute 'alter publication supabase_realtime add table public.games';
  end if;
end $$;

-- 5. Row Level Security
alter table public.games enable row level security;

drop policy if exists "Lecture libre"       on public.games;
drop policy if exists "Création libre"      on public.games;
drop policy if exists "Mise à jour libre"   on public.games;

create policy "Lecture libre"       on public.games for select using (true);
create policy "Création libre"      on public.games for insert with check (true);
create policy "Mise à jour libre"   on public.games for update using (true);

-- 6. Trigger : démarre la partie dès que les deux équipes sont prêtes
--    (évite la race condition côté client)
create or replace function public.auto_start_game()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.team1_ready = true
     and new.team2_ready = true
     and new.status = 'placing'
  then
    new.status := 'playing';
  end if;
  return new;
end;
$$;

drop trigger if exists trigger_auto_start on public.games;
create trigger trigger_auto_start
  before update of team1_ready, team2_ready
  on public.games
  for each row
  execute function public.auto_start_game();
