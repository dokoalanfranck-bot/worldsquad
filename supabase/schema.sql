-- WorldSquad — Supabase Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────
create table if not exists public.users (
  id uuid primary key references auth.users on delete cascade,
  email text unique not null,
  pseudo text unique not null,
  photo_url text,
  card_image_url text,
  nation text not null,
  coins integer default 500,
  level text default 'Rookie',
  card_rarity text default 'Common',
  is_vip boolean default false,
  predictions_correct integer default 0,
  battles_won integer default 0,
  created_at timestamptz default now()
);

alter table public.users enable row level security;
create policy "Users can read any profile" on public.users for select using (true);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.users for insert with check (auth.uid() = id);

-- ─────────────────────────────────────────────
-- GROUPS
-- ─────────────────────────────────────────────
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null,
  creator_id uuid references public.users(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.groups enable row level security;
create policy "Anyone can read groups" on public.groups for select using (true);
create policy "Authenticated users can create groups" on public.groups for insert with check (auth.uid() = creator_id);
create policy "Creator can update group" on public.groups for update using (auth.uid() = creator_id);

-- ─────────────────────────────────────────────
-- GROUP MEMBERS
-- ─────────────────────────────────────────────
create table if not exists public.group_members (
  group_id uuid references public.groups(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

alter table public.group_members enable row level security;
create policy "Members can read group_members" on public.group_members for select using (true);
create policy "Users can join groups" on public.group_members for insert with check (auth.uid() = user_id);
create policy "Users can leave groups" on public.group_members for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- MATCHES
-- ─────────────────────────────────────────────
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  team_a text not null,
  team_b text not null,
  flag_a text,
  flag_b text,
  match_date timestamptz not null,
  score_a integer,
  score_b integer,
  status text default 'upcoming' check (status in ('upcoming','live','finished')),
  phase text check (phase in ('group','round16','quarter','semi','final')),
  group_name text,
  venue text,
  created_at timestamptz default now()
);

alter table public.matches enable row level security;
create policy "Anyone can read matches" on public.matches for select using (true);
create policy "Service role can manage matches" on public.matches for all using (auth.role() = 'service_role');

-- ─────────────────────────────────────────────
-- PREDICTIONS
-- ─────────────────────────────────────────────
create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  match_id uuid references public.matches(id) on delete cascade,
  pred_score_a integer not null check (pred_score_a >= 0 and pred_score_a <= 20),
  pred_score_b integer not null check (pred_score_b >= 0 and pred_score_b <= 20),
  pred_scorer text,
  coins_won integer default 0,
  status text default 'pending' check (status in ('pending','correct_score','correct_winner','wrong')),
  created_at timestamptz default now(),
  unique(user_id, match_id)
);

alter table public.predictions enable row level security;
create policy "Users can read own predictions" on public.predictions for select using (auth.uid() = user_id);
create policy "Group members can read predictions after match starts" on public.predictions for select
  using (
    exists (
      select 1 from public.matches m where m.id = match_id and m.status in ('live','finished')
    )
  );
create policy "Users can insert own predictions" on public.predictions for insert with check (auth.uid() = user_id);
create policy "Users can update own pending predictions" on public.predictions for update
  using (
    auth.uid() = user_id and
    exists (select 1 from public.matches m where m.id = match_id and m.status = 'upcoming')
  );

-- ─────────────────────────────────────────────
-- CARDS
-- ─────────────────────────────────────────────
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('player','nation','event','trophy')),
  name text not null,
  rarity text not null check (rarity in ('Common','Rare','Epic','Legend')),
  image_url text,
  stats jsonb default '{}',
  description text,
  nation text,
  created_at timestamptz default now()
);

alter table public.cards enable row level security;
create policy "Anyone can read cards" on public.cards for select using (true);
create policy "Service role can manage cards" on public.cards for all using (auth.role() = 'service_role');

-- ─────────────────────────────────────────────
-- USER CARDS (collection)
-- ─────────────────────────────────────────────
create table if not exists public.user_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  card_id uuid references public.cards(id) on delete cascade,
  obtained_at timestamptz default now(),
  obtained_via text check (obtained_via in ('pack','battle','event','purchase','signup'))
);

alter table public.user_cards enable row level security;
create policy "Users can read own collection" on public.user_cards for select using (auth.uid() = user_id);
create policy "Service role can manage user_cards" on public.user_cards for all using (auth.role() = 'service_role');
create policy "Users can insert own cards" on public.user_cards for insert with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- BATTLES
-- ─────────────────────────────────────────────
create table if not exists public.battles (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid references public.users(id) on delete cascade,
  opponent_id uuid references public.users(id) on delete cascade,
  challenger_card_id uuid references public.cards(id),
  opponent_card_id uuid references public.cards(id),
  coins_stake integer not null check (coins_stake >= 50 and coins_stake <= 500),
  winner_id uuid references public.users(id),
  status text default 'pending' check (status in ('pending','accepted','finished','declined')),
  stat_compared text,
  result_summary text,
  created_at timestamptz default now()
);

alter table public.battles enable row level security;
create policy "Users can read own battles" on public.battles for select
  using (auth.uid() = challenger_id or auth.uid() = opponent_id);
create policy "Users can create battles" on public.battles for insert with check (auth.uid() = challenger_id);
create policy "Opponent can update battle" on public.battles for update
  using (auth.uid() = opponent_id or auth.uid() = challenger_id);

-- ─────────────────────────────────────────────
-- COIN TRANSACTIONS
-- ─────────────────────────────────────────────
create table if not exists public.coin_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  amount integer not null,
  reason text not null,
  created_at timestamptz default now()
);

alter table public.coin_transactions enable row level security;
create policy "Users can read own transactions" on public.coin_transactions for select using (auth.uid() = user_id);
create policy "Service role can manage transactions" on public.coin_transactions for all using (auth.role() = 'service_role');

-- ─────────────────────────────────────────────
-- PURCHASES
-- ─────────────────────────────────────────────
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  stripe_session_id text unique,
  pack_type text not null,
  coins_granted integer not null,
  amount_paid integer not null,
  status text default 'pending' check (status in ('pending','completed','failed')),
  created_at timestamptz default now()
);

alter table public.purchases enable row level security;
create policy "Users can read own purchases" on public.purchases for select using (auth.uid() = user_id);
create policy "Service role can manage purchases" on public.purchases for all using (auth.role() = 'service_role');

-- ─────────────────────────────────────────────
-- GROUP ACTIVITY FEED
-- ─────────────────────────────────────────────
create table if not exists public.group_activities (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  activity_type text not null,
  message text not null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

alter table public.group_activities enable row level security;
create policy "Group members can read activities" on public.group_activities for select using (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = group_activities.group_id and gm.user_id = auth.uid()
  )
);
create policy "Service role can manage activities" on public.group_activities for all using (auth.role() = 'service_role');
create policy "Users can insert own activities" on public.group_activities for insert with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- REALTIME SUBSCRIPTIONS
-- ─────────────────────────────────────────────
alter publication supabase_realtime add table public.group_activities;
alter publication supabase_realtime add table public.battles;
alter publication supabase_realtime add table public.matches;

-- ─────────────────────────────────────────────
-- STORAGE BUCKETS (run in Supabase dashboard)
-- ─────────────────────────────────────────────
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
-- insert into storage.buckets (id, name, public) values ('cards', 'cards', true);
