-- Résumés vidéo des matchs (liens YouTube)
CREATE TABLE IF NOT EXISTS highlights (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  youtube_id  TEXT NOT NULL,
  match_id    UUID REFERENCES matches(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS highlights_created_at_idx ON highlights (created_at DESC);

ALTER TABLE highlights ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire
CREATE POLICY "highlights_read" ON highlights FOR SELECT USING (true);

-- Seuls les admins peuvent modifier (via service role / admin routes)
CREATE POLICY "highlights_admin_all" ON highlights FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));
