-- Migration: fix matchmaking pour team_match
-- À exécuter dans Supabase > SQL Editor

-- 1. Autoriser coins_stake = 0 (team_match gratuit)
ALTER TABLE public.battles
  DROP CONSTRAINT IF EXISTS battles_coins_stake_check;

ALTER TABLE public.battles
  ADD CONSTRAINT battles_coins_stake_check
  CHECK (coins_stake >= 0 AND coins_stake <= 1000);

-- 2. Fonction atomique de matchmaking (évite les race conditions)
CREATE OR REPLACE FUNCTION public.join_matchmaking(p_user_id uuid, p_skill integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opponent_id uuid;
  v_battle_id   uuid;
BEGIN
  -- Vérifier si l'utilisateur a déjà un battle actif
  SELECT id INTO v_battle_id
  FROM public.battles
  WHERE (challenger_id = p_user_id OR opponent_id = p_user_id)
    AND type = 'team_match'
    AND phase NOT IN ('finished', 'declined')
  LIMIT 1;

  IF v_battle_id IS NOT NULL THEN
    RETURN jsonb_build_object('battleId', v_battle_id, 'resuming', true);
  END IF;

  -- Tenter de s'emparer atomiquement d'un adversaire dans la file
  SELECT user_id INTO v_opponent_id
  FROM public.battle_queue
  WHERE user_id != p_user_id
    AND skill_rating BETWEEN p_skill - 500 AND p_skill + 500
  ORDER BY ABS(skill_rating - p_skill), created_at
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_opponent_id IS NOT NULL THEN
    -- Retirer les deux joueurs de la file (atomique)
    DELETE FROM public.battle_queue WHERE user_id IN (p_user_id, v_opponent_id);

    -- Créer la battle
    INSERT INTO public.battles (
      challenger_id, opponent_id, coins_stake, status, type, phase
    ) VALUES (
      p_user_id, v_opponent_id, 0, 'accepted', 'team_match', 'team_selection'
    )
    RETURNING id INTO v_battle_id;

    RETURN jsonb_build_object('matched', true, 'battleId', v_battle_id);
  END IF;

  -- Pas d'adversaire — rejoindre la file
  INSERT INTO public.battle_queue (user_id, skill_rating)
  VALUES (p_user_id, p_skill)
  ON CONFLICT (user_id) DO UPDATE SET skill_rating = EXCLUDED.skill_rating;

  RETURN jsonb_build_object('queued', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_matchmaking(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_matchmaking(uuid, integer) TO service_role;
