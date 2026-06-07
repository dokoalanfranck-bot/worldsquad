-- WorldSquad — Seed Data
-- Run AFTER schema.sql in Supabase SQL Editor

-- ═══════════════════════════════════════════════════════════
-- NATION CARDS (48 nations)
-- ═══════════════════════════════════════════════════════════

insert into public.cards (type, name, rarity, nation, stats, description) values
('nation', 'Brazil', 'Legend', 'Brazil', '{"force": 99, "defense": 92, "attack": 98, "prestige": 99}', '5-time World Cup champions. The Selecao.'),
('nation', 'France', 'Legend', 'France', '{"force": 97, "defense": 91, "attack": 95, "prestige": 97}', 'Defending champions 2018. Les Bleus.'),
('nation', 'Argentina', 'Legend', 'Argentina', '{"force": 96, "defense": 89, "attack": 97, "prestige": 96}', '2022 World Cup champions. La Albiceleste.'),
('nation', 'Germany', 'Legend', 'Germany', '{"force": 95, "defense": 93, "attack": 90, "prestige": 95}', '4-time World Cup winners. Die Mannschaft.'),
('nation', 'Spain', 'Epic', 'Spain', '{"force": 93, "defense": 90, "attack": 92, "prestige": 93}', '2010 World Cup champions. La Roja.'),
('nation', 'England', 'Epic', 'England', '{"force": 92, "defense": 88, "attack": 91, "prestige": 91}', 'The Three Lions. Still seeking a second star.'),
('nation', 'Portugal', 'Epic', 'Portugal', '{"force": 91, "defense": 85, "attack": 93, "prestige": 90}', 'Home of Cristiano Ronaldo. A Selecao das Quinas.'),
('nation', 'Netherlands', 'Epic', 'Netherlands', '{"force": 90, "defense": 87, "attack": 90, "prestige": 88}', 'Total football legacy. Oranje.'),
('nation', 'Belgium', 'Epic', 'Belgium', '{"force": 88, "defense": 84, "attack": 89, "prestige": 86}', 'The Red Devils. Golden generation.'),
('nation', 'Croatia', 'Epic', 'Croatia', '{"force": 87, "defense": 86, "attack": 84, "prestige": 87}', '2018 finalists. Vatreni.'),
('nation', 'Uruguay', 'Epic', 'Uruguay', '{"force": 86, "defense": 85, "attack": 83, "prestige": 85}', 'La Celeste. 2-time champions.'),
('nation', 'Italy', 'Epic', 'Italy', '{"force": 88, "defense": 90, "attack": 82, "prestige": 88}', 'Gli Azzurri. 4-time champions.'),
('nation', 'USA', 'Rare', 'USA', '{"force": 83, "defense": 80, "attack": 82, "prestige": 78}', 'Co-host 2026. USMNT rising.'),
('nation', 'Mexico', 'Rare', 'Mexico', '{"force": 82, "defense": 79, "attack": 82, "prestige": 80}', 'Co-host 2026. El Tri.'),
('nation', 'Canada', 'Rare', 'Canada', '{"force": 81, "defense": 78, "attack": 80, "prestige": 75}', 'Co-host 2026. Les Rouges.'),
('nation', 'Morocco', 'Rare', 'Morocco', '{"force": 84, "defense": 88, "attack": 78, "prestige": 82}', '2022 semi-finalists. Atlas Lions.'),
('nation', 'Japan', 'Rare', 'Japan', '{"force": 82, "defense": 83, "attack": 78, "prestige": 79}', 'Samurai Blue. Giant-killers.'),
('nation', 'Senegal', 'Rare', 'Senegal', '{"force": 83, "defense": 82, "attack": 80, "prestige": 80}', 'African champions. Lions de la Teranga.'),
('nation', 'Switzerland', 'Rare', 'Switzerland', '{"force": 82, "defense": 84, "attack": 78, "prestige": 80}', 'La Nati. Knockout stage regulars.'),
('nation', 'Denmark', 'Rare', 'Denmark', '{"force": 83, "defense": 84, "attack": 79, "prestige": 81}', 'Danish Dynamite reborn.'),
('nation', 'South Korea', 'Rare', 'South Korea', '{"force": 80, "defense": 79, "attack": 79, "prestige": 78}', 'Taeguk Warriors. Son generation.'),
('nation', 'Serbia', 'Rare', 'Serbia', '{"force": 81, "defense": 79, "attack": 82, "prestige": 77}', 'Orlovi. Talented attacking unit.'),
('nation', 'Poland', 'Rare', 'Poland', '{"force": 79, "defense": 78, "attack": 80, "prestige": 77}', 'Bialo-czerwoni. Lewandowski team.'),
('nation', 'Australia', 'Rare', 'Australia', '{"force": 78, "defense": 77, "attack": 76, "prestige": 74}', 'Socceroos. 2022 QF surprise.'),
('nation', 'Ecuador', 'Common', 'Ecuador', '{"force": 76, "defense": 75, "attack": 74, "prestige": 70}', 'La Tri. CONMEBOL representatives.'),
('nation', 'Iran', 'Common', 'Iran', '{"force": 74, "defense": 75, "attack": 71, "prestige": 68}', 'Team Melli. Asian power.'),
('nation', 'Wales', 'Common', 'Wales', '{"force": 75, "defense": 74, "attack": 73, "prestige": 72}', 'Y Dreigiau. Bale successors.'),
('nation', 'Saudi Arabia', 'Common', 'Saudi Arabia', '{"force": 73, "defense": 72, "attack": 72, "prestige": 68}', 'Al-Akhdar. 2022 giant-killers.'),
('nation', 'Tunisia', 'Common', 'Tunisia', '{"force": 73, "defense": 74, "attack": 70, "prestige": 67}', 'Les Aigles de Carthage.'),
('nation', 'Costa Rica', 'Common', 'Costa Rica', '{"force": 72, "defense": 73, "attack": 68, "prestige": 70}', 'Los Ticos. 2014 QF heroes.'),
('nation', 'Cameroon', 'Common', 'Cameroon', '{"force": 74, "defense": 72, "attack": 73, "prestige": 72}', 'Les Lions Indomptables.'),
('nation', 'Ghana', 'Common', 'Ghana', '{"force": 73, "defense": 71, "attack": 73, "prestige": 71}', 'The Black Stars.'),
('nation', 'Qatar', 'Common', 'Qatar', '{"force": 68, "defense": 67, "attack": 65, "prestige": 64}', 'Al Annabi. 2022 hosts.'),
('nation', 'Colombia', 'Common', 'Colombia', '{"force": 80, "defense": 77, "attack": 81, "prestige": 78}', 'Los Cafeteros. Diaz generation.'),
('nation', 'Chile', 'Common', 'Chile', '{"force": 77, "defense": 75, "attack": 77, "prestige": 75}', 'La Roja. Copa America veterans.'),
('nation', 'Venezuela', 'Common', 'Venezuela', '{"force": 74, "defense": 72, "attack": 74, "prestige": 68}', 'La Vinotinto. Rising force.'),
('nation', 'Paraguay', 'Common', 'Paraguay', '{"force": 72, "defense": 73, "attack": 70, "prestige": 68}', 'La Albirroja.'),
('nation', 'Peru', 'Common', 'Peru', '{"force": 75, "defense": 73, "attack": 74, "prestige": 72}', 'La Blanquirroja.'),
('nation', 'Turkey', 'Common', 'Turkey', '{"force": 79, "defense": 76, "attack": 79, "prestige": 76}', 'The Crescent-Stars.'),
('nation', 'Ukraine', 'Common', 'Ukraine', '{"force": 78, "defense": 76, "attack": 77, "prestige": 74}', 'Zbirna.'),
('nation', 'Austria', 'Common', 'Austria', '{"force": 78, "defense": 77, "attack": 78, "prestige": 75}', 'Das Nationalteam.'),
('nation', 'Czech Republic', 'Common', 'Czech Republic', '{"force": 77, "defense": 76, "attack": 76, "prestige": 74}', 'Representace.'),
('nation', 'Nigeria', 'Common', 'Nigeria', '{"force": 80, "defense": 77, "attack": 80, "prestige": 78}', 'Super Eagles.'),
('nation', 'Algeria', 'Common', 'Algeria', '{"force": 77, "defense": 75, "attack": 76, "prestige": 74}', 'Les Fennecs.'),
('nation', 'Romania', 'Common', 'Romania', '{"force": 75, "defense": 74, "attack": 74, "prestige": 71}', 'Tricolorii.'),
('nation', 'New Zealand', 'Common', 'New Zealand', '{"force": 69, "defense": 68, "attack": 67, "prestige": 63}', 'All Whites.'),
('nation', 'Mali', 'Common', 'Mali', '{"force": 75, "defense": 74, "attack": 74, "prestige": 69}', 'Les Aigles.'),
('nation', 'South Africa', 'Common', 'South Africa', '{"force": 71, "defense": 70, "attack": 70, "prestige": 67}', 'Bafana Bafana.');

-- ═══════════════════════════════════════════════════════════
-- PLAYER CARDS (50 players)
-- ═══════════════════════════════════════════════════════════

insert into public.cards (type, name, rarity, nation, stats, description) values
('player', 'Kylian Mbappe', 'Legend', 'France', '{"vitesse": 99, "technique": 97, "puissance": 88, "sang_froid": 94, "overall": 97}', 'Le Bondissant. Real Madrid. Pure speed.'),
('player', 'Vinicius Jr', 'Legend', 'Brazil', '{"vitesse": 98, "technique": 96, "puissance": 84, "sang_froid": 88, "overall": 95}', 'Ballon d Or 2024. Joga Bonito incarnate.'),
('player', 'Jude Bellingham', 'Legend', 'England', '{"vitesse": 88, "technique": 92, "puissance": 91, "sang_froid": 92, "overall": 93}', 'Real Madrid complete midfielder.'),
('player', 'Erling Haaland', 'Legend', 'Norway', '{"vitesse": 89, "technique": 85, "puissance": 97, "sang_froid": 93, "overall": 94}', 'The Machine. Unnatural goal scorer.'),
('player', 'Lionel Messi', 'Legend', 'Argentina', '{"vitesse": 85, "technique": 99, "puissance": 79, "sang_froid": 97, "overall": 96}', 'The GOAT. 2022 World Cup winner.'),
('player', 'Pedri', 'Epic', 'Spain', '{"vitesse": 82, "technique": 95, "puissance": 75, "sang_froid": 91, "overall": 91}', 'Barcelona midfield maestro.'),
('player', 'Kevin De Bruyne', 'Epic', 'Belgium', '{"vitesse": 84, "technique": 94, "puissance": 83, "sang_froid": 93, "overall": 92}', 'Premier League best midfielder.'),
('player', 'Mohamed Salah', 'Epic', 'Egypt', '{"vitesse": 94, "technique": 91, "puissance": 81, "sang_froid": 90, "overall": 91}', 'Liverpool legend. The Egyptian King.'),
('player', 'Robert Lewandowski', 'Epic', 'Poland', '{"vitesse": 80, "technique": 88, "puissance": 91, "sang_froid": 93, "overall": 90}', 'Clinical finisher. Champions League winner.'),
('player', 'Sadio Mane', 'Epic', 'Senegal', '{"vitesse": 93, "technique": 88, "puissance": 83, "sang_froid": 87, "overall": 89}', 'African champion. Explosive forward.'),
('player', 'Luka Modric', 'Epic', 'Croatia', '{"vitesse": 79, "technique": 95, "puissance": 73, "sang_froid": 93, "overall": 90}', 'Ballon d Or winner. Still class.'),
('player', 'Toni Kroos', 'Epic', 'Germany', '{"vitesse": 75, "technique": 96, "puissance": 78, "sang_froid": 95, "overall": 89}', 'Metronome. Champion de tout.'),
('player', 'Joshua Kimmich', 'Epic', 'Germany', '{"vitesse": 82, "technique": 91, "puissance": 82, "sang_froid": 89, "overall": 90}', 'Versatile Bayern captain.'),
('player', 'Bukayo Saka', 'Epic', 'England', '{"vitesse": 90, "technique": 90, "puissance": 77, "sang_froid": 88, "overall": 89}', 'Arsenal key man. England future.'),
('player', 'Marcus Rashford', 'Epic', 'England', '{"vitesse": 92, "technique": 84, "puissance": 82, "sang_froid": 83, "overall": 86}', 'Pacey Manchester United forward.'),
('player', 'Son Heung-min', 'Epic', 'South Korea', '{"vitesse": 91, "technique": 89, "puissance": 80, "sang_froid": 87, "overall": 89}', 'Tottenham captain. Asian icon.'),
('player', 'Jamal Musiala', 'Epic', 'Germany', '{"vitesse": 88, "technique": 93, "puissance": 75, "sang_froid": 88, "overall": 90}', 'Bayern wonderkid. Germany next star.'),
('player', 'Lamine Yamal', 'Epic', 'Spain', '{"vitesse": 92, "technique": 95, "puissance": 72, "sang_froid": 90, "overall": 92}', 'Euro 2024 sensation. Spain prodigy.'),
('player', 'Rodri', 'Epic', 'Spain', '{"vitesse": 76, "technique": 91, "puissance": 87, "sang_froid": 93, "overall": 92}', 'Ballon d Or 2024. Defensive maestro.'),
('player', 'Ruben Dias', 'Epic', 'Portugal', '{"vitesse": 78, "technique": 84, "puissance": 89, "sang_froid": 90, "overall": 89}', 'Manchester City defensive rock.'),
('player', 'Serge Gnabry', 'Rare', 'Germany', '{"vitesse": 90, "technique": 85, "puissance": 79, "sang_froid": 83, "overall": 85}', 'Bayern winger. Hat-trick specialist.'),
('player', 'Phil Foden', 'Rare', 'England', '{"vitesse": 85, "technique": 91, "puissance": 76, "sang_froid": 87, "overall": 88}', 'Man City wizard. The Stockport Iniesta.'),
('player', 'Rafael Leao', 'Rare', 'Portugal', '{"vitesse": 95, "technique": 86, "puissance": 81, "sang_froid": 82, "overall": 87}', 'AC Milan electric forward.'),
('player', 'Gavi', 'Rare', 'Spain', '{"vitesse": 82, "technique": 89, "puissance": 76, "sang_froid": 85, "overall": 86}', 'Barcelona young maestro.'),
('player', 'Achraf Hakimi', 'Rare', 'Morocco', '{"vitesse": 93, "technique": 83, "puissance": 79, "sang_froid": 82, "overall": 86}', 'PSG right-back. Africa best fullback.'),
('player', 'Victor Osimhen', 'Rare', 'Nigeria', '{"vitesse": 90, "technique": 83, "puissance": 89, "sang_froid": 82, "overall": 87}', 'Napoli striker. African powerhouse.'),
('player', 'Florian Wirtz', 'Rare', 'Germany', '{"vitesse": 87, "technique": 93, "puissance": 74, "sang_froid": 87, "overall": 89}', 'Bayer Leverkusen creator.'),
('player', 'Julian Alvarez', 'Rare', 'Argentina', '{"vitesse": 84, "technique": 87, "puissance": 80, "sang_froid": 87, "overall": 86}', 'Man City striker. World Cup winner.'),
('player', 'Brahim Diaz', 'Rare', 'Morocco', '{"vitesse": 88, "technique": 88, "puissance": 73, "sang_froid": 84, "overall": 85}', 'Real Madrid playmaker.'),
('player', 'Christian Pulisic', 'Rare', 'USA', '{"vitesse": 87, "technique": 85, "puissance": 75, "sang_froid": 84, "overall": 84}', 'Captain America. AC Milan forward.'),
('player', 'Antony', 'Common', 'Brazil', '{"vitesse": 88, "technique": 82, "puissance": 74, "sang_froid": 75, "overall": 79}', 'Manchester United winger.'),
('player', 'Gabriel Martinelli', 'Common', 'Brazil', '{"vitesse": 91, "technique": 83, "puissance": 78, "sang_froid": 79, "overall": 82}', 'Arsenal energetic forward.'),
('player', 'Alexis Mac Allister', 'Common', 'Argentina', '{"vitesse": 78, "technique": 84, "puissance": 80, "sang_froid": 84, "overall": 83}', 'Liverpool midfield engine.'),
('player', 'Enzo Fernandez', 'Common', 'Argentina', '{"vitesse": 80, "technique": 83, "puissance": 81, "sang_froid": 82, "overall": 82}', 'Chelsea World Cup winner.'),
('player', 'Cody Gakpo', 'Common', 'Netherlands', '{"vitesse": 89, "technique": 84, "puissance": 80, "sang_froid": 80, "overall": 83}', 'Liverpool Dutch forward.'),
('player', 'Xavi Simons', 'Common', 'Netherlands', '{"vitesse": 87, "technique": 87, "puissance": 74, "sang_froid": 82, "overall": 84}', 'PSG creative gem.'),
('player', 'Takumi Minamino', 'Common', 'Japan', '{"vitesse": 86, "technique": 82, "puissance": 74, "sang_froid": 81, "overall": 80}', 'Japan tireless runner.'),
('player', 'Joao Felix', 'Common', 'Portugal', '{"vitesse": 85, "technique": 87, "puissance": 74, "sang_froid": 79, "overall": 82}', 'Atletico creative forward.'),
('player', 'Aurelien Tchouameni', 'Common', 'France', '{"vitesse": 80, "technique": 84, "puissance": 87, "sang_froid": 84, "overall": 85}', 'Real Madrid defensive midfielder.'),
('player', 'Adrien Rabiot', 'Common', 'France', '{"vitesse": 80, "technique": 83, "puissance": 84, "sang_froid": 81, "overall": 82}', 'Juventus box-to-box.'),
('player', 'Nicolo Barella', 'Common', 'Italy', '{"vitesse": 81, "technique": 85, "puissance": 82, "sang_froid": 83, "overall": 85}', 'Inter midfield dynamo.'),
('player', 'Federico Valverde', 'Common', 'Uruguay', '{"vitesse": 86, "technique": 85, "puissance": 84, "sang_froid": 86, "overall": 86}', 'Real Madrid complete midfielder.'),
('player', 'Mike Maignan', 'Common', 'France', '{"vitesse": 72, "technique": 82, "puissance": 80, "sang_froid": 88, "overall": 85}', 'AC Milan goalkeeper. Best in Europe.'),
('player', 'Antoine Griezmann', 'Common', 'France', '{"vitesse": 82, "technique": 88, "puissance": 78, "sang_froid": 88, "overall": 87}', 'Atletico striker. France icon.'),
('player', 'Richarlison', 'Common', 'Brazil', '{"vitesse": 84, "technique": 80, "puissance": 84, "sang_froid": 79, "overall": 81}', 'Tottenham Brazilian warrior.'),
('player', 'Harry Kane', 'Common', 'England', '{"vitesse": 76, "technique": 86, "puissance": 87, "sang_froid": 90, "overall": 88}', 'Bayern Munich. England all-time scorer.'),
('player', 'Olivier Giroud', 'Common', 'France', '{"vitesse": 71, "technique": 80, "puissance": 86, "sang_froid": 87, "overall": 80}', 'France legend. World Cup winner.'),
('player', 'Memphis Depay', 'Common', 'Netherlands', '{"vitesse": 88, "technique": 86, "puissance": 81, "sang_froid": 83, "overall": 83}', 'Atletico Dutch talisman.'),
('player', 'Bernardo Silva', 'Common', 'Portugal', '{"vitesse": 85, "technique": 91, "puissance": 76, "sang_froid": 87, "overall": 88}', 'Man City versatile gem.'),
('player', 'Leroy Sane', 'Common', 'Germany', '{"vitesse": 92, "technique": 87, "puissance": 77, "sang_froid": 80, "overall": 85}', 'Bayern electric winger.');

-- ═══════════════════════════════════════════════════════════
-- TROPHY CARDS (10)
-- ═══════════════════════════════════════════════════════════

insert into public.cards (type, name, rarity, stats, description) values
('trophy', 'Le Prophete', 'Legend', '{"requirement": "5 scores exacts"}', 'Tu as predit 5 scores exacts. Tu n es pas humain.'),
('trophy', 'All-In', 'Legend', '{"requirement": "Predit le champion final"}', 'Tu avais mise sur le bon cheval depuis le debut.'),
('trophy', 'Sans Faute', 'Epic', '{"requirement": "Phase de groupes parfaite"}', 'Tous tes pronostics de groupe etaient bons.'),
('trophy', 'Chasseur d Upset', 'Rare', '{"requirement": "3 surprises predites"}', 'Tu as vu venir les surprises que personne n attendait.'),
('trophy', 'Sniper', 'Rare', '{"requirement": "10 bons vainqueurs"}', '10 vainqueurs corrects. Ton instinct ne te trompe pas.'),
('trophy', 'Roi des Battles', 'Epic', '{"requirement": "10 battles gagnes"}', 'Les rivaux te fuient. Tu regnes sur les arenes.'),
('trophy', 'Collectionneur', 'Rare', '{"requirement": "50 cartes collectees"}', 'Mi-chemin. La quete continue.'),
('trophy', 'La Legende', 'Legend', '{"requirement": "108 cartes collectees"}', 'Collection complete. Statut de legende confirme.'),
('trophy', 'Early Bird', 'Common', '{"requirement": "Inscrit avant le premier match"}', 'Tu etais la avant que ca commence.'),
('trophy', 'VIP Gold', 'Epic', '{"requirement": "Membre VIP"}', 'Le club des elites. Bordure doree meritee.');

-- ═══════════════════════════════════════════════════════════
-- MATCHES — FIFA World Cup 2026 (Group Stage)
-- ═══════════════════════════════════════════════════════════

insert into public.matches (team_a, team_b, flag_a, flag_b, match_date, phase, group_name) values
-- Group A
('Mexico', 'Uruguay', '🇲🇽', '🇺🇾', '2026-06-11 20:00:00+00', 'group', 'A'),
('South Africa', 'Senegal', '🇿🇦', '🇸🇳', '2026-06-12 17:00:00+00', 'group', 'A'),
('Senegal', 'Mexico', '🇸🇳', '🇲🇽', '2026-06-16 20:00:00+00', 'group', 'A'),
('Uruguay', 'South Africa', '🇺🇾', '🇿🇦', '2026-06-16 23:00:00+00', 'group', 'A'),
('Mexico', 'South Africa', '🇲🇽', '🇿🇦', '2026-06-20 20:00:00+00', 'group', 'A'),
('Uruguay', 'Senegal', '🇺🇾', '🇸🇳', '2026-06-20 20:00:00+00', 'group', 'A'),
-- Group B
('USA', 'Canada', '🇺🇸', '🇨🇦', '2026-06-12 20:00:00+00', 'group', 'B'),
('Argentina', 'Peru', '🇦🇷', '🇵🇪', '2026-06-13 00:00:00+00', 'group', 'B'),
('Canada', 'Argentina', '🇨🇦', '🇦🇷', '2026-06-17 17:00:00+00', 'group', 'B'),
('Peru', 'USA', '🇵🇪', '🇺🇸', '2026-06-17 23:00:00+00', 'group', 'B'),
('USA', 'Argentina', '🇺🇸', '🇦🇷', '2026-06-21 20:00:00+00', 'group', 'B'),
('Canada', 'Peru', '🇨🇦', '🇵🇪', '2026-06-21 20:00:00+00', 'group', 'B'),
-- Group C
('Spain', 'Brazil', '🇪🇸', '🇧🇷', '2026-06-13 17:00:00+00', 'group', 'C'),
('Japan', 'Nigeria', '🇯🇵', '🇳🇬', '2026-06-13 20:00:00+00', 'group', 'C'),
('Brazil', 'Japan', '🇧🇷', '🇯🇵', '2026-06-17 20:00:00+00', 'group', 'C'),
('Nigeria', 'Spain', '🇳🇬', '🇪🇸', '2026-06-18 00:00:00+00', 'group', 'C'),
('Spain', 'Japan', '🇪🇸', '🇯🇵', '2026-06-22 20:00:00+00', 'group', 'C'),
('Brazil', 'Nigeria', '🇧🇷', '🇳🇬', '2026-06-22 20:00:00+00', 'group', 'C'),
-- Group D
('France', 'Morocco', '🇫🇷', '🇲🇦', '2026-06-14 17:00:00+00', 'group', 'D'),
('Belgium', 'Colombia', '🇧🇪', '🇨🇴', '2026-06-14 20:00:00+00', 'group', 'D'),
('Morocco', 'Belgium', '🇲🇦', '🇧🇪', '2026-06-18 17:00:00+00', 'group', 'D'),
('Colombia', 'France', '🇨🇴', '🇫🇷', '2026-06-19 00:00:00+00', 'group', 'D'),
('France', 'Belgium', '🇫🇷', '🇧🇪', '2026-06-23 20:00:00+00', 'group', 'D'),
('Morocco', 'Colombia', '🇲🇦', '🇨🇴', '2026-06-23 20:00:00+00', 'group', 'D'),
-- Group E
('England', 'Australia', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🇦🇺', '2026-06-15 17:00:00+00', 'group', 'E'),
('Netherlands', 'Venezuela', '🇳🇱', '🇻🇪', '2026-06-15 20:00:00+00', 'group', 'E'),
('Australia', 'Netherlands', '🇦🇺', '🇳🇱', '2026-06-19 17:00:00+00', 'group', 'E'),
('Venezuela', 'England', '🇻🇪', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '2026-06-19 20:00:00+00', 'group', 'E'),
('England', 'Netherlands', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🇳🇱', '2026-06-24 20:00:00+00', 'group', 'E'),
('Australia', 'Venezuela', '🇦🇺', '🇻🇪', '2026-06-24 20:00:00+00', 'group', 'E'),
-- Group F
('Portugal', 'Turkey', '🇵🇹', '🇹🇷', '2026-06-15 23:00:00+00', 'group', 'F'),
('Germany', 'Chile', '🇩🇪', '🇨🇱', '2026-06-16 17:00:00+00', 'group', 'F'),
('Turkey', 'Germany', '🇹🇷', '🇩🇪', '2026-06-20 17:00:00+00', 'group', 'F'),
('Chile', 'Portugal', '🇨🇱', '🇵🇹', '2026-06-20 23:00:00+00', 'group', 'F'),
('Portugal', 'Germany', '🇵🇹', '🇩🇪', '2026-06-24 23:00:00+00', 'group', 'F'),
('Turkey', 'Chile', '🇹🇷', '🇨🇱', '2026-06-24 23:00:00+00', 'group', 'F'),
-- Group G
('Croatia', 'Ecuador', '🇭🇷', '🇪🇨', '2026-06-16 00:00:00+00', 'group', 'G'),
('Serbia', 'South Korea', '🇷🇸', '🇰🇷', '2026-06-16 20:00:00+00', 'group', 'G'),
('Ecuador', 'Serbia', '🇪🇨', '🇷🇸', '2026-06-21 17:00:00+00', 'group', 'G'),
('South Korea', 'Croatia', '🇰🇷', '🇭🇷', '2026-06-21 23:00:00+00', 'group', 'G'),
('Croatia', 'Serbia', '🇭🇷', '🇷🇸', '2026-06-25 20:00:00+00', 'group', 'G'),
('Ecuador', 'South Korea', '🇪🇨', '🇰🇷', '2026-06-25 20:00:00+00', 'group', 'G'),
-- Group H
('Switzerland', 'Cameroon', '🇨🇭', '🇨🇲', '2026-06-17 00:00:00+00', 'group', 'H'),
('Italy', 'Algeria', '🇮🇹', '🇩🇿', '2026-06-18 20:00:00+00', 'group', 'H'),
('Cameroon', 'Italy', '🇨🇲', '🇮🇹', '2026-06-22 17:00:00+00', 'group', 'H'),
('Algeria', 'Switzerland', '🇩🇿', '🇨🇭', '2026-06-22 23:00:00+00', 'group', 'H'),
('Switzerland', 'Italy', '🇨🇭', '🇮🇹', '2026-06-26 20:00:00+00', 'group', 'H'),
('Cameroon', 'Algeria', '🇨🇲', '🇩🇿', '2026-06-26 20:00:00+00', 'group', 'H'),
-- Group I
('Iran', 'Wales', '🇮🇷', '🏴󠁧󠁢󠁷󠁬󠁳󠁿', '2026-06-18 17:00:00+00', 'group', 'I'),
('Poland', 'Saudi Arabia', '🇵🇱', '🇸🇦', '2026-06-18 23:00:00+00', 'group', 'I'),
('Wales', 'Poland', '🏴󠁧󠁢󠁷󠁬󠁳󠁿', '🇵🇱', '2026-06-22 20:00:00+00', 'group', 'I'),
('Saudi Arabia', 'Iran', '🇸🇦', '🇮🇷', '2026-06-23 17:00:00+00', 'group', 'I'),
('Iran', 'Poland', '🇮🇷', '🇵🇱', '2026-06-27 20:00:00+00', 'group', 'I'),
('Wales', 'Saudi Arabia', '🏴󠁧󠁢󠁷󠁬󠁳󠁿', '🇸🇦', '2026-06-27 20:00:00+00', 'group', 'I'),
-- Group J
('Denmark', 'Tunisia', '🇩🇰', '🇹🇳', '2026-06-19 17:00:00+00', 'group', 'J'),
('Qatar', 'Ghana', '🇶🇦', '🇬🇭', '2026-06-19 23:00:00+00', 'group', 'J'),
('Tunisia', 'Qatar', '🇹🇳', '🇶🇦', '2026-06-23 20:00:00+00', 'group', 'J'),
('Ghana', 'Denmark', '🇬🇭', '🇩🇰', '2026-06-23 23:00:00+00', 'group', 'J'),
('Denmark', 'Qatar', '🇩🇰', '🇶🇦', '2026-06-27 23:00:00+00', 'group', 'J'),
('Tunisia', 'Ghana', '🇹🇳', '🇬🇭', '2026-06-27 23:00:00+00', 'group', 'J'),
-- Group K
('Austria', 'Paraguay', '🇦🇹', '🇵🇾', '2026-06-20 17:00:00+00', 'group', 'K'),
('Costa Rica', 'Czech Republic', '🇨🇷', '🇨🇿', '2026-06-20 00:00:00+00', 'group', 'K'),
('Paraguay', 'Costa Rica', '🇵🇾', '🇨🇷', '2026-06-24 17:00:00+00', 'group', 'K'),
('Czech Republic', 'Austria', '🇨🇿', '🇦🇹', '2026-06-24 20:00:00+00', 'group', 'K'),
('Austria', 'Costa Rica', '🇦🇹', '🇨🇷', '2026-06-28 20:00:00+00', 'group', 'K'),
('Paraguay', 'Czech Republic', '🇵🇾', '🇨🇿', '2026-06-28 20:00:00+00', 'group', 'K'),
-- Group L
('Romania', 'Ukraine', '🇷🇴', '🇺🇦', '2026-06-21 00:00:00+00', 'group', 'L'),
('New Zealand', 'Mali', '🇳🇿', '🇲🇱', '2026-06-21 17:00:00+00', 'group', 'L'),
('Ukraine', 'New Zealand', '🇺🇦', '🇳🇿', '2026-06-25 17:00:00+00', 'group', 'L'),
('Mali', 'Romania', '🇲🇱', '🇷🇴', '2026-06-25 23:00:00+00', 'group', 'L'),
('Romania', 'New Zealand', '🇷🇴', '🇳🇿', '2026-06-29 20:00:00+00', 'group', 'L'),
('Ukraine', 'Mali', '🇺🇦', '🇲🇱', '2026-06-29 20:00:00+00', 'group', 'L');

-- Round of 32
insert into public.matches (team_a, team_b, flag_a, flag_b, match_date, phase) values
('Winner A', 'Runner B', '🏳', '🏳', '2026-07-01 20:00:00+00', 'round16'),
('Winner C', 'Runner D', '🏳', '🏳', '2026-07-02 00:00:00+00', 'round16'),
('Winner B', 'Runner A', '🏳', '🏳', '2026-07-02 17:00:00+00', 'round16'),
('Winner D', 'Runner C', '🏳', '🏳', '2026-07-02 20:00:00+00', 'round16'),
('Winner E', 'Runner F', '🏳', '🏳', '2026-07-03 20:00:00+00', 'round16'),
('Winner G', 'Runner H', '🏳', '🏳', '2026-07-04 00:00:00+00', 'round16'),
('Winner F', 'Runner E', '🏳', '🏳', '2026-07-04 17:00:00+00', 'round16'),
('Winner H', 'Runner G', '🏳', '🏳', '2026-07-04 20:00:00+00', 'round16'),
('Winner I', 'Runner J', '🏳', '🏳', '2026-07-05 20:00:00+00', 'round16'),
('Winner K', 'Runner L', '🏳', '🏳', '2026-07-06 00:00:00+00', 'round16'),
('Winner J', 'Runner I', '🏳', '🏳', '2026-07-06 17:00:00+00', 'round16'),
('Winner L', 'Runner K', '🏳', '🏳', '2026-07-06 20:00:00+00', 'round16'),
('Best 3rd 1', 'Best 3rd 2', '🏳', '🏳', '2026-07-07 20:00:00+00', 'round16'),
('Best 3rd 3', 'Best 3rd 4', '🏳', '🏳', '2026-07-07 23:00:00+00', 'round16'),
('Best 3rd 5', 'Best 3rd 6', '🏳', '🏳', '2026-07-08 20:00:00+00', 'round16'),
('Best 3rd 7', 'Best 3rd 8', '🏳', '🏳', '2026-07-08 23:00:00+00', 'round16');

-- Quarter Finals
insert into public.matches (team_a, team_b, flag_a, flag_b, match_date, phase) values
('QF1 TBD', 'QF1 TBD', '🏳', '🏳', '2026-07-10 20:00:00+00', 'quarter'),
('QF2 TBD', 'QF2 TBD', '🏳', '🏳', '2026-07-10 23:00:00+00', 'quarter'),
('QF3 TBD', 'QF3 TBD', '🏳', '🏳', '2026-07-11 20:00:00+00', 'quarter'),
('QF4 TBD', 'QF4 TBD', '🏳', '🏳', '2026-07-11 23:00:00+00', 'quarter'),
('QF5 TBD', 'QF5 TBD', '🏳', '🏳', '2026-07-12 20:00:00+00', 'quarter'),
('QF6 TBD', 'QF6 TBD', '🏳', '🏳', '2026-07-12 23:00:00+00', 'quarter'),
('QF7 TBD', 'QF7 TBD', '🏳', '🏳', '2026-07-13 20:00:00+00', 'quarter'),
('QF8 TBD', 'QF8 TBD', '🏳', '🏳', '2026-07-13 23:00:00+00', 'quarter');

-- Semi Finals
insert into public.matches (team_a, team_b, flag_a, flag_b, match_date, phase) values
('SF1 TBD', 'SF1 TBD', '🏳', '🏳', '2026-07-15 20:00:00+00', 'semi'),
('SF2 TBD', 'SF2 TBD', '🏳', '🏳', '2026-07-15 23:00:00+00', 'semi'),
('SF3 TBD', 'SF3 TBD', '🏳', '🏳', '2026-07-16 20:00:00+00', 'semi'),
('SF4 TBD', 'SF4 TBD', '🏳', '🏳', '2026-07-16 23:00:00+00', 'semi');

-- 3rd Place
insert into public.matches (team_a, team_b, flag_a, flag_b, match_date, phase) values
('3rd Place TBD', '3rd Place TBD', '🏳', '🏳', '2026-07-18 20:00:00+00', 'semi');

-- Final
insert into public.matches (team_a, team_b, flag_a, flag_b, match_date, phase) values
('Finalist 1', 'Finalist 2', '🏳', '🏳', '2026-07-19 20:00:00+00', 'final');
