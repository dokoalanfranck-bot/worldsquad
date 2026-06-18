-- Tournoi multijoueur : vrai duels entre joueurs réels
-- Les matchs du tournoi utilisent le système de duel existant

-- Lier les duels à leur tournoi
ALTER TABLE duels
  ADD COLUMN IF NOT EXISTS tournament_id   UUID REFERENCES tournaments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tournament_round TEXT; -- 'semi1' | 'semi2' | 'final'

-- Colonnes manquantes dans tournaments pour le multijoueur
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS p1_id         UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS p2_id         UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS p3_id         UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS join_deadline      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS semi1_duel_id     UUID REFERENCES duels(id),
  ADD COLUMN IF NOT EXISTS semi2_duel_id     UUID REFERENCES duels(id),
  ADD COLUMN IF NOT EXISTS final_duel_id     UUID REFERENCES duels(id),
  ADD COLUMN IF NOT EXISTS semi1_winner_id   UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS semi1_winner_slot INT,
  ADD COLUMN IF NOT EXISTS semi2_winner_id   UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS semi2_winner_slot INT;

-- Mise à jour du status
ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournaments_status_check;
ALTER TABLE tournaments ADD CONSTRAINT tournaments_status_check
  CHECK (status IN ('waiting', 'semi_active', 'final_active', 'finished', 'cancelled'));

-- RLS : les 4 joueurs peuvent lire leur tournoi
DROP POLICY IF EXISTS "Users read own tournament" ON tournaments;
DROP POLICY IF EXISTS "Players read tournament"   ON tournaments;
CREATE POLICY "Players read tournament" ON tournaments FOR SELECT USING (
  auth.uid() = p0_id
  OR auth.uid() = p1_id
  OR auth.uid() = p2_id
  OR auth.uid() = p3_id
);

-- Realtime pour la salle d'attente et le suivi du bracket
ALTER PUBLICATION supabase_realtime ADD TABLE tournaments;

