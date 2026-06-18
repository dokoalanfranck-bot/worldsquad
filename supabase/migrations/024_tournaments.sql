-- Mode Tournoi : 1 joueur réel vs 3 bots (bracket 4 joueurs)
CREATE TABLE IF NOT EXISTS tournaments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status      TEXT NOT NULL DEFAULT 'finished',

  -- Slot 0 = joueur réel
  p0_id       UUID REFERENCES users(id),
  p0_pseudo   TEXT NOT NULL DEFAULT '',
  p0_nation   TEXT NOT NULL DEFAULT '',

  -- Slots 1-3 = bots
  p1_pseudo   TEXT NOT NULL DEFAULT '',
  p1_nation   TEXT NOT NULL DEFAULT '',
  p2_pseudo   TEXT NOT NULL DEFAULT '',
  p2_nation   TEXT NOT NULL DEFAULT '',
  p3_pseudo   TEXT NOT NULL DEFAULT '',
  p3_nation   TEXT NOT NULL DEFAULT '',

  -- Résultats : semi1 = p0 vs p1, semi2 = p2 vs p3
  semi1       JSONB,   -- {scoreA, scoreB, events, winner: 0|1}
  semi2       JSONB,   -- {scoreA, scoreB, events, winner: 2|3}
  final       JSONB,   -- {scoreA, scoreB, events, winner: 0|1|2|3}

  winner_slot INT,
  winner_id   UUID REFERENCES users(id),
  coins_won   INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own tournament" ON tournaments
  FOR SELECT USING (auth.uid() = p0_id);
