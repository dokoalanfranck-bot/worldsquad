-- Add install reward tracking to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS install_reward_claimed boolean NOT NULL DEFAULT false;
