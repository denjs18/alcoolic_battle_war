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
  created_at          bigint      not null
);

-- Full row needed in realtime payload
alter table public.games replica identity full;

-- Activate realtime for this table
alter publication supabase_realtime add table public.games;

-- Row Level Security (accès ouvert — jeu entre amis)
alter table public.games enable row level security;

create policy "Lecture libre"    on public.games for select using (true);
create policy "Création libre"   on public.games for insert with check (true);
create policy "Mise à jour libre" on public.games for update using (true);

-- Nettoyage automatique des parties > 24h (optionnel)
-- Nécessite pg_cron activé dans Extensions
-- select cron.schedule('cleanup-old-games', '0 * * * *',
--   $$delete from public.games where created_at < extract(epoch from now() - interval '24 hours') * 1000$$
-- );
