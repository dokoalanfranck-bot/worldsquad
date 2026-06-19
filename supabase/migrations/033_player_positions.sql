-- Migration 033: positions des joueurs + stats GK/Coach spécifiques
-- À exécuter dans Supabase SQL Editor

-- ── 1. Attaquants ────────────────────────────────────────────────────────────
UPDATE cards SET stats = stats || '{"position": "FWD"}'
WHERE type = 'player' AND name IN (
  'Kylian Mbappe', 'Vinicius Jr', 'Erling Haaland', 'Lionel Messi',
  'Mohamed Salah', 'Sadio Mane', 'Robert Lewandowski',
  'Marcus Rashford', 'Son Heung-min', 'Lamine Yamal',
  'Serge Gnabry', 'Rafael Leao', 'Victor Osimhen', 'Julian Alvarez',
  'Christian Pulisic', 'Antony', 'Gabriel Martinelli', 'Cody Gakpo',
  'Joao Felix', 'Antoine Griezmann', 'Richarlison', 'Harry Kane',
  'Olivier Giroud', 'Memphis Depay', 'Leroy Sane', 'Bukayo Saka'
);

-- ── 2. Milieux ───────────────────────────────────────────────────────────────
UPDATE cards SET stats = stats || '{"position": "MID"}'
WHERE type = 'player' AND name IN (
  'Jude Bellingham', 'Pedri', 'Kevin De Bruyne', 'Luka Modric',
  'Toni Kroos', 'Jamal Musiala', 'Phil Foden', 'Gavi',
  'Brahim Diaz', 'Alexis Mac Allister', 'Enzo Fernandez',
  'Xavi Simons', 'Takumi Minamino', 'Adrien Rabiot',
  'Nicolo Barella', 'Federico Valverde', 'Bernardo Silva', 'Florian Wirtz'
);

-- ── 3. Défenseurs ────────────────────────────────────────────────────────────
UPDATE cards SET stats = stats || '{"position": "DEF"}'
WHERE type = 'player' AND name IN (
  'Joshua Kimmich', 'Ruben Dias', 'Achraf Hakimi', 'Rodri',
  'Aurelien Tchouameni'
);

-- ── 4. Gardien existant — nouvelles stats GK ────────────────────────────────
UPDATE cards SET
  stats = '{"reflexes": 92, "plongee": 88, "positionnement": 87, "communication": 83, "overall": 88, "position": "GK"}'
WHERE type = 'player' AND name = 'Mike Maignan';

-- ── 5. Nouveaux gardiens ─────────────────────────────────────────────────────
INSERT INTO cards (type, name, rarity, nation, stats, description) VALUES
('player', 'Alisson Becker',  'Legend', 'Brazil',   '{"reflexes": 97, "plongee": 95, "positionnement": 96, "communication": 90, "overall": 96, "position": "GK"}', 'Liverpool and Brazil #1. World class.'),
('player', 'Manuel Neuer',    'Epic',   'Germany',  '{"reflexes": 93, "plongee": 91, "positionnement": 95, "communication": 92, "overall": 93, "position": "GK"}', 'Bayern legend. Sweeper keeper pioneer.'),
('player', 'Thibaut Courtois','Epic',   'Belgium',  '{"reflexes": 94, "plongee": 92, "positionnement": 93, "communication": 88, "overall": 93, "position": "GK"}', 'Real Madrid Guardian. Euro 2020 MVP.'),
('player', 'Yassine Bounou',  'Rare',   'Morocco',  '{"reflexes": 88, "plongee": 86, "positionnement": 85, "communication": 83, "overall": 87, "position": "GK"}', 'Bono. Morocco 2022 hero.'),
('player', 'Jordan Pickford', 'Rare',   'England',  '{"reflexes": 86, "plongee": 84, "positionnement": 83, "communication": 85, "overall": 85, "position": "GK"}', 'Everton & England keeper.'),
('player', 'Andre Onana',     'Rare',   'Cameroon', '{"reflexes": 85, "plongee": 83, "positionnement": 84, "communication": 81, "overall": 84, "position": "GK"}', 'Manchester United goalkeeper.'),
('player', 'Marc-Andre ter Stegen', 'Common', 'Germany', '{"reflexes": 83, "plongee": 82, "positionnement": 84, "communication": 80, "overall": 84, "position": "GK"}', 'Barcelona sweeper. German reliable.'),
('player', 'David Raya',      'Common', 'Spain',    '{"reflexes": 82, "plongee": 81, "positionnement": 82, "communication": 79, "overall": 82, "position": "GK"}', 'Arsenal shot-stopper.'),
('player', 'Emiliano Martinez', 'Epic', 'Argentina','{"reflexes": 91, "plongee": 89, "positionnement": 90, "communication": 86, "overall": 91, "position": "GK"}', 'Aston Villa. 2022 World Cup winner.');

-- ── 6. Coachs (nouvelles cartes) ─────────────────────────────────────────────
INSERT INTO cards (type, name, rarity, nation, stats, description) VALUES
('player', 'Pep Guardiola',   'Legend', 'Spain',     '{"tactique": 99, "motivation": 95, "leadership": 97, "pression": 93, "overall": 97, "position": "COACH"}', 'Man City 4x EPL. Tiki-taka visionary.'),
('player', 'Jurgen Klopp',    'Legend', 'Germany',   '{"tactique": 95, "motivation": 99, "leadership": 98, "pression": 95, "overall": 97, "position": "COACH"}', 'Gegenpressing legend. Liverpool CL 2019.'),
('player', 'Carlo Ancelotti', 'Legend', 'Italy',     '{"tactique": 96, "motivation": 94, "leadership": 97, "pression": 92, "overall": 96, "position": "COACH"}', 'Only coach with 4 Champions Leagues.'),
('player', 'Didier Deschamps','Epic',   'France',    '{"tactique": 91, "motivation": 92, "leadership": 94, "pression": 90, "overall": 92, "position": "COACH"}', 'France 2018 champion. Les Bleus boss.'),
('player', 'Luis Enrique',    'Epic',   'Spain',     '{"tactique": 92, "motivation": 89, "leadership": 88, "pression": 87, "overall": 90, "position": "COACH"}', 'PSG coach. Attacking philosophy.'),
('player', 'Jose Mourinho',   'Epic',   'Portugal',  '{"tactique": 93, "motivation": 90, "leadership": 93, "pression": 96, "overall": 92, "position": "COACH"}', 'The Special One. Pragmatic genius.'),
('player', 'Zinedine Zidane', 'Epic',   'France',    '{"tactique": 90, "motivation": 94, "leadership": 96, "pression": 88, "overall": 93, "position": "COACH"}', '3 CL en 3 ans avec le Real. Légende.'),
('player', 'Antonio Conte',   'Rare',   'Italy',     '{"tactique": 90, "motivation": 95, "leadership": 91, "pression": 88, "overall": 91, "position": "COACH"}', 'Napoli. Intensity tactician.'),
('player', 'Xavi Hernandez',  'Rare',   'Spain',     '{"tactique": 89, "motivation": 85, "leadership": 84, "pression": 82, "overall": 86, "position": "COACH"}', 'Barcelona head coach. Tiki-taka DNA.'),
('player', 'Hansi Flick',     'Rare',   'Germany',   '{"tactique": 87, "motivation": 88, "leadership": 85, "pression": 83, "overall": 86, "position": "COACH"}', 'Bayern Triple 2020. Barcelona now.'),
('player', 'Aliou Cisse',     'Rare',   'Senegal',   '{"tactique": 84, "motivation": 90, "leadership": 88, "pression": 82, "overall": 86, "position": "COACH"}', 'Senegal CAN 2021 champion.'),
('player', 'Walid Regragui',  'Common', 'Morocco',   '{"tactique": 83, "motivation": 89, "leadership": 85, "pression": 80, "overall": 84, "position": "COACH"}', 'Atlas Lions semi-finalist 2022.'),
('player', 'Rigobert Song',   'Common', 'Cameroon',  '{"tactique": 80, "motivation": 85, "leadership": 82, "pression": 78, "overall": 81, "position": "COACH"}', 'Lions Indomptables head coach.'),
('player', 'Vahid Halilhodzic','Common','Tunisia',   '{"tactique": 81, "motivation": 83, "leadership": 80, "pression": 79, "overall": 81, "position": "COACH"}', 'Experience sur 4 continents.');
