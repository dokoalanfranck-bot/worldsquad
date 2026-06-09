-- ── Battles V2 — système de rounds Best-of-3 ──────────────────────────────
-- À exécuter dans Supabase > SQL Editor

-- 1. Colonne rounds (jsonb) sur la table battles
alter table public.battles
  add column if not exists rounds jsonb;

-- 2. Étendre la contrainte sur coins_stake (de 500 à 1000)
alter table public.battles
  drop constraint if exists battles_coins_stake_check;
alter table public.battles
  add constraint battles_coins_stake_check
  check (coins_stake >= 50 and coins_stake <= 1000);

-- 3. Colonnes de statistiques battles sur la table users
alter table public.users
  add column if not exists battles_played integer default 0,
  add column if not exists battle_streak integer default 0,
  add column if not exists best_streak integer default 0;

-- 4. Statut "declined" dans la table battles (si pas déjà présent)
alter table public.battles
  drop constraint if exists battles_status_check;
alter table public.battles
  add constraint battles_status_check
  check (status in ('pending', 'accepted', 'finished', 'declined'));
