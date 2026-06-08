-- Admin migration for WorldSquad
-- Run this in your Supabase SQL editor

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS group_letter text;

CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  flag text DEFAULT '🏳',
  group_letter text,
  confederation text,
  fifa_rank integer,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teams_public_read" ON teams FOR SELECT USING (true);

-- Run this to make yourself admin (replace your email):
-- UPDATE users SET is_admin = true WHERE email = 'your@email.com';

-- For coin_transactions table (if not exists):
CREATE TABLE IF NOT EXISTS coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coin_transactions_own_read" ON coin_transactions FOR SELECT USING (auth.uid() = user_id);

-- increment_coins RPC (if not exists):
CREATE OR REPLACE FUNCTION increment_coins(user_id uuid, delta integer)
RETURNS void AS $$
  UPDATE users SET coins = coins + delta WHERE id = user_id;
$$ LANGUAGE sql;

-- increment_predictions_correct RPC (if not exists):
CREATE OR REPLACE FUNCTION increment_predictions_correct(user_id uuid)
RETURNS void AS $$
  UPDATE users SET predictions_correct = predictions_correct + 1 WHERE id = user_id;
$$ LANGUAGE sql;
