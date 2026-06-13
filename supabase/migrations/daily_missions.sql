-- Daily missions table
CREATE TABLE IF NOT EXISTS daily_missions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date          date        NOT NULL DEFAULT CURRENT_DATE,
  prediction_done boolean   NOT NULL DEFAULT false,
  pack_done       boolean   NOT NULL DEFAULT false,
  battle_won      boolean   NOT NULL DEFAULT false,
  bonus_claimed   boolean   NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- RLS
ALTER TABLE daily_missions ENABLE ROW LEVEL SECURITY;

-- Users can only read their own missions (writes via service role only)
CREATE POLICY "Users can view own missions"
  ON daily_missions FOR SELECT
  USING (auth.uid() = user_id);
