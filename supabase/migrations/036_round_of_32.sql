-- Tour des 32 — Coupe du Monde 2026
-- Supprime les placeholders TDB existants (phase round_of_32 encore upcoming)
DELETE FROM matches
WHERE phase = 'round_of_32'
  AND status = 'upcoming'
  AND (
    team_a IN ('TDB', 'À déterminer', 'TBD', '')
    OR team_b IN ('TDB', 'À déterminer', 'TBD', '')
  );

-- Insertion des 16 matchs (heures en UTC, heure locale ET = UTC-4)
INSERT INTO matches (team_a, team_b, flag_a, flag_b, match_date, phase, status, stadium, city) VALUES

-- 28 juin
('Afrique du Sud', 'Canada',           '🇿🇦','🇨🇦', '2026-06-28 19:00:00+00', 'round_of_32', 'upcoming', 'SoFi Stadium',           'Los Angeles'),

-- 29 juin
('Brésil',         'Japon',            '🇧🇷','🇯🇵', '2026-06-29 17:00:00+00', 'round_of_32', 'upcoming', 'NRG Stadium',            'Houston'),
('Allemagne',      'Paraguay',         '🇩🇪','🇵🇾', '2026-06-29 20:30:00+00', 'round_of_32', 'upcoming', 'Gillette Stadium',       'Boston'),
('Pays-Bas',       'Maroc',            '🇳🇱','🇲🇦', '2026-06-30 01:00:00+00', 'round_of_32', 'upcoming', 'Estadio BBVA',           'Monterrey'),

-- 30 juin
('Côte d''Ivoire', 'Norvège',          '🇨🇮','🇳🇴', '2026-06-30 17:00:00+00', 'round_of_32', 'upcoming', 'AT&T Stadium',           'Dallas'),
('France',         'Suède',            '🇫🇷','🇸🇪', '2026-06-30 21:00:00+00', 'round_of_32', 'upcoming', 'MetLife Stadium',        'New York'),
('Mexique',        'Équateur',         '🇲🇽','🇪🇨', '2026-07-01 01:00:00+00', 'round_of_32', 'upcoming', 'Estadio Azteca',         'Mexico City'),

-- 1er juillet
('Angleterre',     'Congo DR',         '🏴󠁧󠁢󠁥󠁮󠁧󠁿','🇨🇩', '2026-07-01 16:00:00+00', 'round_of_32', 'upcoming', 'Mercedes-Benz Stadium',  'Atlanta'),
('Belgique',       'Sénégal',          '🇧🇪','🇸🇳', '2026-07-01 20:00:00+00', 'round_of_32', 'upcoming', 'Lumen Field',            'Seattle'),
('USA',            'Bosnie-Herzégovine','🇺🇸','🇧🇦', '2026-07-02 00:00:00+00', 'round_of_32', 'upcoming', 'Levi''s Stadium',        'San Francisco'),

-- 2 juillet
('Espagne',        'Autriche',         '🇪🇸','🇦🇹', '2026-07-02 19:00:00+00', 'round_of_32', 'upcoming', 'SoFi Stadium',           'Los Angeles'),
('Portugal',       'Croatie',          '🇵🇹','🇭🇷', '2026-07-02 23:00:00+00', 'round_of_32', 'upcoming', 'BMO Field',              'Toronto'),
('Suisse',         'Algérie',          '🇨🇭','🇩🇿', '2026-07-03 03:00:00+00', 'round_of_32', 'upcoming', 'BC Place',               'Vancouver'),

-- 3 juillet
('Australie',      'Égypte',           '🇦🇺','🇪🇬', '2026-07-03 18:00:00+00', 'round_of_32', 'upcoming', 'AT&T Stadium',           'Dallas'),
('Argentine',      'Cap-Vert',         '🇦🇷','🇨🇻', '2026-07-03 22:00:00+00', 'round_of_32', 'upcoming', 'Hard Rock Stadium',      'Miami'),
('Colombie',       'Ghana',            '🇨🇴','🇬🇭', '2026-07-04 01:30:00+00', 'round_of_32', 'upcoming', 'Arrowhead Stadium',      'Kansas City');
