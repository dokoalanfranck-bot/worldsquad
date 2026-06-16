-- Migration 015 — Configuration des missions du jour

CREATE TABLE IF NOT EXISTS public.mission_config (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_coins integer NOT NULL DEFAULT 300,
  pack_coins       integer NOT NULL DEFAULT 30,
  battle_coins     integer NOT NULL DEFAULT 300,
  bonus_coins      integer NOT NULL DEFAULT 200,
  updated_at       timestamptz DEFAULT now()
);

-- Ligne unique par défaut
INSERT INTO public.mission_config (prediction_coins, pack_coins, battle_coins, bonus_coins)
VALUES (300, 30, 300, 200)
ON CONFLICT DO NOTHING;
