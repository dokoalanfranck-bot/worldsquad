-- Cleanup duplicate player cards — à exécuter dans Supabase > SQL Editor

DO $$
DECLARE
  v_dupes  INT := 0;
  v_remain INT := 0;
BEGIN

  -- Table temporaire des doublons (canonical = id le plus petit par name+nation)
  CREATE TEMP TABLE _dm AS
  WITH r AS (
    SELECT id, name, nation,
      first_value(id) OVER (PARTITION BY name, nation ORDER BY id ASC) AS cid
    FROM cards WHERE type = 'player'
  )
  SELECT id AS did, cid FROM r WHERE id <> cid;

  SELECT count(*) INTO v_dupes FROM _dm;

  IF v_dupes = 0 THEN
    RAISE NOTICE 'Aucun doublon trouvé.';
    DROP TABLE _dm;
    RETURN;
  END IF;

  -- Rediriger user_cards vers la canonique (si le user ne la possède pas déjà)
  UPDATE user_cards uc
  SET card_id = dm.cid
  FROM _dm dm
  WHERE uc.card_id = dm.did
    AND NOT EXISTS (
      SELECT 1 FROM user_cards u2
      WHERE u2.user_id = uc.user_id AND u2.card_id = dm.cid
    );

  -- Supprimer les user_cards restants sur des doublons
  DELETE FROM user_cards WHERE card_id IN (SELECT did FROM _dm);

  -- Libérer les FK battles
  UPDATE battles SET challenger_card_id = NULL WHERE challenger_card_id IN (SELECT did FROM _dm);
  UPDATE battles SET opponent_card_id   = NULL WHERE opponent_card_id   IN (SELECT did FROM _dm);
  UPDATE battles SET reward_card_id     = NULL WHERE reward_card_id     IN (SELECT did FROM _dm);

  -- Supprimer les cartes doublons
  DELETE FROM cards WHERE id IN (SELECT did FROM _dm);

  SELECT count(*) INTO v_remain FROM cards WHERE type = 'player';

  RAISE NOTICE 'Doublons supprimés : % | Cartes joueurs restantes : %', v_dupes, v_remain;

  DROP TABLE _dm;

END $$;

-- Afficher le résultat final
SELECT count(*) AS cartes_joueurs FROM cards WHERE type = 'player';
