-- ============================================================
--  Alcoolic Battle War — Supabase schema
--  À exécuter dans : Supabase Dashboard > SQL Editor
-- ============================================================

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

-- Si la table existe déjà, ajouter la colonne last_shot
alter table public.games add column if not exists last_shot jsonb;

-- Full row needed in realtime payload
alter table public.games replica identity full;

-- Activate realtime for this table
alter publication supabase_realtime add table public.games;

-- Row Level Security (accès ouvert — jeu entre amis)
alter table public.games enable row level security;

drop policy if exists "Lecture libre"      on public.games;
drop policy if exists "Création libre"     on public.games;
drop policy if exists "Mise à jour libre"  on public.games;

create policy "Lecture libre"      on public.games for select using (true);
create policy "Création libre"     on public.games for insert with check (true);
create policy "Mise à jour libre"  on public.games for update using (true);
