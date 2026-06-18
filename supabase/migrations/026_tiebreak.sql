-- Tiebreak : tirs au but automatiques en cas d'égalité en tournoi

ALTER TABLE duels
  ADD COLUMN IF NOT EXISTS tiebreak_battle_id UUID REFERENCES penalty_battles(id) ON DELETE SET NULL;

ALTER TABLE duels DROP CONSTRAINT IF EXISTS duels_status_check;
ALTER TABLE duels ADD CONSTRAINT duels_status_check
  CHECK (status IN ('invited','open','picking','stealing','tiebreak','finished','cancelled'));

ALTER TABLE penalty_battles
  ADD COLUMN IF NOT EXISTS tournament_duel_id UUID REFERENCES duels(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tournament_id      UUID REFERENCES tournaments(id) ON DELETE SET NULL;
