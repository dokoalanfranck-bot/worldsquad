-- Table pour l'historique des envois de cartes par l'admin
CREATE TABLE IF NOT EXISTS admin_gifts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id     UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_ids     UUID[] NOT NULL DEFAULT '{}',
  reason       TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_gifts_created_at_idx ON admin_gifts(created_at DESC);
CREATE INDEX IF NOT EXISTS admin_gifts_recipient_idx  ON admin_gifts(recipient_id);

-- Seul l'admin peut lire (via service role / admin client, pas de RLS nécessaire)
ALTER TABLE admin_gifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only" ON admin_gifts FOR ALL USING (false);
