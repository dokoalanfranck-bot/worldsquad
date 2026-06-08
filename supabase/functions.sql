-- WorldSquad — Supabase RPC Functions
-- Run AFTER schema.sql

-- Increment coins atomically
create or replace function increment_coins(user_id uuid, delta integer)
returns void
language sql
security definer
as $$
  update public.users
  set coins = coins + delta
  where id = user_id;
$$;

-- Increment predictions_correct
create or replace function increment_predictions_correct(user_id uuid)
returns void
language sql
security definer
as $$
  update public.users
  set predictions_correct = predictions_correct + 1
  where id = user_id;
$$;

-- Increment battles_won
create or replace function increment_battles_won(user_id uuid)
returns void
language sql
security definer
as $$
  update public.users
  set battles_won = battles_won + 1
  where id = user_id;
$$;
