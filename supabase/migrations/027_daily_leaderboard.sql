-- Classement journalier des battles
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS daily_battles_won INT NOT NULL DEFAULT 0;
