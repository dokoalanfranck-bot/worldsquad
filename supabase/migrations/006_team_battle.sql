-- Migration: système de battle par équipe (3 joueurs + coach)
-- À exécuter dans Supabase > SQL Editor

ALTER TABLE public.battles
  ADD COLUMN IF NOT EXISTS challenger_team   jsonb,
  ADD COLUMN IF NOT EXISTS opponent_team     jsonb,
  ADD COLUMN IF NOT EXISTS challenger_cohesion integer,
  ADD COLUMN IF NOT EXISTS opponent_cohesion   integer,
  ADD COLUMN IF NOT EXISTS match_events      jsonb,
  ADD COLUMN IF NOT EXISTS final_score       jsonb,
  ADD COLUMN IF NOT EXISTS match_start_at    timestamptz;

-- Activer Realtime sur battles si pas déjà fait
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.battles;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
