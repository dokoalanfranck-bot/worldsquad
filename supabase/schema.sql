-- WorldSquad — Supabase Schema (idempotent — safe to re-run)
-- Run this in Supabase SQL Editor

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
  is_admin boolean default false,
  predictions_correct integer default 0,
  battles_won integer default 0,
  created_at timestamptz default now()
);

alter table public.users enable row level security;
drop policy if exists "Users can read any profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Users can insert own profile" on public.users;
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
drop policy if exists "Anyone can read groups" on public.groups;
drop policy if exists "Authenticated users can create groups" on public.groups;
drop policy if exists "Creator can update group" on public.groups;
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
drop policy if exists "Members can read group_members" on public.group_members;
drop policy if exists "Users can join groups" on public.group_members;
drop policy if exists "Users can leave groups" on public.group_members;
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
  group_letter text,
  group_name text,
  venue text,
  created_at timestamptz default now()
);

alter table public.matches enable row level security;
drop policy if exists "Anyone can read matches" on public.matches;
drop policy if exists "Service role can manage matches" on public.matches;
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
drop policy if exists "Users can read own predictions" on public.predictions;
drop policy if exists "Group members can read predictions after match starts" on public.predictions;
drop policy if exists "Users can insert own predictions" on public.predictions;
drop policy if exists "Users can update own pending predictions" on public.predictions;
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
  position text,
  flag text,
  created_at timestamptz default now()
);

alter table public.cards enable row level security;
drop policy if exists "Anyone can read cards" on public.cards;
drop policy if exists "Service role can manage cards" on public.cards;
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
drop policy if exists "Users can read own collection" on public.user_cards;
drop policy if exists "Service role can manage user_cards" on public.user_cards;
drop policy if exists "Users can insert own cards" on public.user_cards;
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
drop policy if exists "Users can read own battles" on public.battles;
drop policy if exists "Users can create battles" on public.battles;
drop policy if exists "Opponent can update battle" on public.battles;
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
drop policy if exists "Users can read own transactions" on public.coin_transactions;
drop policy if exists "Users can insert own transactions" on public.coin_transactions;
drop policy if exists "Service role can manage transactions" on public.coin_transactions;
create policy "Users can read own transactions" on public.coin_transactions for select using (auth.uid() = user_id);
create policy "Users can insert own transactions" on public.coin_transactions for insert with check (auth.uid() = user_id);
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
drop policy if exists "Users can read own purchases" on public.purchases;
drop policy if exists "Service role can manage purchases" on public.purchases;
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
drop policy if exists "Group members can read activities" on public.group_activities;
drop policy if exists "Service role can manage activities" on public.group_activities;
drop policy if exists "Users can insert own activities" on public.group_activities;
create policy "Group members can read activities" on public.group_activities for select using (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = group_activities.group_id and gm.user_id = auth.uid()
  )
);
create policy "Service role can manage activities" on public.group_activities for all using (auth.role() = 'service_role');
create policy "Users can insert own activities" on public.group_activities for insert with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- TEAMS (World Cup groups)
-- ─────────────────────────────────────────────
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  flag text default '🏳',
  group_letter text,
  confederation text,
  fifa_rank integer,
  created_at timestamptz default now()
);

alter table public.teams enable row level security;
drop policy if exists "Anyone can read teams" on public.teams;
drop policy if exists "Service role can manage teams" on public.teams;
create policy "Anyone can read teams" on public.teams for select using (true);
create policy "Service role can manage teams" on public.teams for all using (auth.role() = 'service_role');

-- ─────────────────────────────────────────────
-- ADMIN COLUMNS (safe to run even if already added)
-- ─────────────────────────────────────────────
alter table public.users add column if not exists is_admin boolean default false;
alter table public.matches add column if not exists group_letter text;

-- Daily reward system
alter table public.users add column if not exists daily_reward_claimed_at timestamptz;
alter table public.users add column if not exists daily_streak integer default 0;

-- ─────────────────────────────────────────────
-- PUSH SUBSCRIPTIONS (Web Push / PWA)
-- ─────────────────────────────────────────────
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz default now()
);

alter table public.push_subscriptions enable row level security;
drop policy if exists "Users manage own push subs" on public.push_subscriptions;
create policy "Users manage own push subs" on public.push_subscriptions
  for all using (auth.uid() = user_id);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

-- ─────────────────────────────────────────────
-- HELPER FUNCTIONS
-- ─────────────────────────────────────────────
create or replace function increment_coins(user_id uuid, delta integer)
returns void as $$
  update public.users set coins = coins + delta where id = user_id;
$$ language sql security definer;

create or replace function increment_predictions_correct(user_id uuid)
returns void as $$
  update public.users set predictions_correct = predictions_correct + 1 where id = user_id;
$$ language sql security definer;

-- ─────────────────────────────────────────────
-- REALTIME
-- ─────────────────────────────────────────────
do $$ begin
  alter publication supabase_realtime add table public.group_activities;
exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.battles;
exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.matches;
exception when others then null; end $$;

-- ─────────────────────────────────────────────
-- STORAGE BUCKETS
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('cards', 'cards', true) on conflict (id) do nothing;

drop policy if exists "Avatars are public" on storage.objects;
drop policy if exists "Users can upload own avatar" on storage.objects;
drop policy if exists "Cards are public" on storage.objects;
drop policy if exists "Users can upload own card" on storage.objects;
create policy "Avatars are public" on storage.objects for select using (bucket_id = 'avatars');
create policy "Users can upload own avatar" on storage.objects for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Cards are public" on storage.objects for select using (bucket_id = 'cards');
create policy "Users can upload own card" on storage.objects for insert with check (bucket_id = 'cards' and auth.uid()::text = (storage.foldername(name))[1]);
