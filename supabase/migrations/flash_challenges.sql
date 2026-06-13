-- Flash challenges table
CREATE TABLE IF NOT EXISTS flash_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Défi Flash',
  bonus_coins integer NOT NULL DEFAULT 100,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Claims — prevents a user from getting the bonus twice on the same challenge
CREATE TABLE IF NOT EXISTS flash_challenge_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES flash_challenges(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);

-- RLS
ALTER TABLE flash_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Flash challenges viewable by all authenticated users"
  ON flash_challenges FOR SELECT USING (auth.uid() IS NOT NULL);

ALTER TABLE flash_challenge_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own claims"
  ON flash_challenge_claims FOR SELECT USING (auth.uid() = user_id);

-- Index for fast active-challenge lookups
CREATE INDEX IF NOT EXISTS flash_challenges_match_id_idx ON flash_challenges(match_id);
CREATE INDEX IF NOT EXISTS flash_challenges_ends_at_idx ON flash_challenges(ends_at);
