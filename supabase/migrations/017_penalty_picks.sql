-- Add picking/stealing phase to penalty battles

ALTER TABLE public.penalty_battles
  ADD COLUMN IF NOT EXISTS challenger_picks JSONB,
  ADD COLUMN IF NOT EXISTS opponent_picks   JSONB,
  ADD COLUMN IF NOT EXISTS picks_deadline   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stake_count      INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS stolen_card_ids  TEXT[]  DEFAULT '{}';

-- Extend status constraint
ALTER TABLE public.penalty_battles DROP CONSTRAINT IF EXISTS penalty_battles_status_check;
ALTER TABLE public.penalty_battles
  ADD CONSTRAINT penalty_battles_status_check
  CHECK (status IN ('waiting','picking','active','stealing','finished','cancelled'));
