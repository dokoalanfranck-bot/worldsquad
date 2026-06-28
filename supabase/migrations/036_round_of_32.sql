-- Tour des 32 — Coupe du Monde 2026

-- 1. Mettre à jour le constraint phase pour inclure les phases KO
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_phase_check;
ALTER TABLE matches ADD CONSTRAINT matches_phase_check
  CHECK (phase IN ('group','round_of_32','round_of_16','quarter_final','semi_final','final'));

-- 2. Supprimer les placeholders TDB existants
DELETE FROM matches
WHERE phase = 'round_of_32'
  AND status = 'upcoming'
  AND (
    team_a IN ('TDB', 'À déterminer', 'TBD', '')
    OR team_b IN ('TDB', 'À déterminer', 'TBD', '')
  );

-- 3. Insérer les 16 matchs (heures UTC · ET = UTC-4)
INSERT INTO matches (team_a, team_b, flag_a, flag_b, match_date, phase, status, venue) VALUES
('Afrique du Sud', 'Canada',            '🇿🇦','🇨🇦', '2026-06-28 19:00:00+00', 'round_of_32', 'upcoming', 'SoFi Stadium · Los Angeles'),
('Brésil',         'Japon',             '🇧🇷','🇯🇵', '2026-06-29 17:00:00+00', 'round_of_32', 'upcoming', 'NRG Stadium · Houston'),
('Allemagne',      'Paraguay',          '🇩🇪','🇵🇾', '2026-06-29 20:30:00+00', 'round_of_32', 'upcoming', 'Gillette Stadium · Boston'),
('Pays-Bas',       'Maroc',             '🇳🇱','🇲🇦', '2026-06-30 01:00:00+00', 'round_of_32', 'upcoming', 'Estadio BBVA · Monterrey'),
('Côte d''Ivoire', 'Norvège',           '🇨🇮','🇳🇴', '2026-06-30 17:00:00+00', 'round_of_32', 'upcoming', 'AT&T Stadium · Dallas'),
('France',         'Suède',             '🇫🇷','🇸🇪', '2026-06-30 21:00:00+00', 'round_of_32', 'upcoming', 'MetLife Stadium · New York'),
('Mexique',        'Équateur',          '🇲🇽','🇪🇨', '2026-07-01 01:00:00+00', 'round_of_32', 'upcoming', 'Estadio Azteca · Mexico City'),
('Angleterre',     'Congo DR',          '🏴󠁧󠁢󠁥󠁮󠁧󠁿','🇨🇩', '2026-07-01 16:00:00+00', 'round_of_32', 'upcoming', 'Mercedes-Benz Stadium · Atlanta'),
('Belgique',       'Sénégal',           '🇧🇪','🇸🇳', '2026-07-01 20:00:00+00', 'round_of_32', 'upcoming', 'Lumen Field · Seattle'),
('USA',            'Bosnie-Herzégovine','🇺🇸','🇧🇦', '2026-07-02 00:00:00+00', 'round_of_32', 'upcoming', 'Levi''s Stadium · San Francisco'),
('Espagne',        'Autriche',          '🇪🇸','🇦🇹', '2026-07-02 19:00:00+00', 'round_of_32', 'upcoming', 'SoFi Stadium · Los Angeles'),
('Portugal',       'Croatie',           '🇵🇹','🇭🇷', '2026-07-02 23:00:00+00', 'round_of_32', 'upcoming', 'BMO Field · Toronto'),
('Suisse',         'Algérie',           '🇨🇭','🇩🇿', '2026-07-03 03:00:00+00', 'round_of_32', 'upcoming', 'BC Place · Vancouver'),
('Australie',      'Égypte',            '🇦🇺','🇪🇬', '2026-07-03 18:00:00+00', 'round_of_32', 'upcoming', 'AT&T Stadium · Dallas'),
('Argentine',      'Cap-Vert',          '🇦🇷','🇨🇻', '2026-07-03 22:00:00+00', 'round_of_32', 'upcoming', 'Hard Rock Stadium · Miami'),
('Colombie',       'Ghana',             '🇨🇴','🇬🇭', '2026-07-04 01:30:00+00', 'round_of_32', 'upcoming', 'Arrowhead Stadium · Kansas City');
