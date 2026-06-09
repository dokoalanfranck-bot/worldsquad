-- ── Draft Duel — matchmaking + phases temps réel ─────────────────────────
-- À exécuter dans Supabase > SQL Editor

-- 1. File d'attente matchmaking
create table if not exists public.battle_queue (
  user_id uuid primary key references public.users(id) on delete cascade,
  skill_rating integer default 0 not null,
  created_at timestamptz default now()
);

alter table public.battle_queue enable row level security;
drop policy if exists "Users can manage own queue entry" on public.battle_queue;
create policy "Users can manage own queue entry" on public.battle_queue
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Realtime sur battle_queue
do $$ begin
  alter publication supabase_realtime add table public.battle_queue;
exception when duplicate_object then null;
end $$;

-- 2. Nouvelles colonnes sur battles pour le Draft Duel
alter table public.battles
  add column if not exists type text default 'classic',
  add column if not exists phase text default 'pending',
  add column if not exists challenger_draft jsonb,
  add column if not exists opponent_draft jsonb,
  add column if not exists challenger_ban text,
  add column if not exists opponent_ban text,
  add column if not exists available_stats jsonb,
  add column if not exists round_picks jsonb default '{}',
  add column if not exists current_round integer default 1,
  add column if not exists reward_card_id uuid references public.cards(id);

-- Realtime sur battles
do $$ begin
  alter publication supabase_realtime add table public.battles;
exception when duplicate_object then null;
end $$;
