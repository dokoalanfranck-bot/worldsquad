-- WorldSquad — Duels v2 (clean rewrite)
-- Table: duels
-- Status flow: open → picking → finished

CREATE TABLE IF NOT EXISTS public.duels (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  opponent_id     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  is_bot          boolean NOT NULL DEFAULT false,
  bot_name        text,

  status          text NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'picking', 'finished')),

  -- Card picks — JSONB arrays of Card objects (3 players + 1 coach each)
  challenger_picks  jsonb,
  opponent_picks    jsonb,
  picks_deadline    timestamptz,

  -- Match result (set when both pick)
  match_events      jsonb,
  challenger_score  integer,
  opponent_score    integer,
  winner_id         uuid,  -- challenger_id | opponent_id | null (draw)

  -- Reward
  reward_card_id    uuid REFERENCES public.cards(id),

  coins_stake       integer NOT NULL DEFAULT 50,
  created_at        timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.duels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "duels_select" ON public.duels;
DROP POLICY IF EXISTS "duels_insert" ON public.duels;

CREATE POLICY "duels_select" ON public.duels FOR SELECT
  USING (auth.uid() = challenger_id OR auth.uid() = opponent_id OR is_bot = true);

CREATE POLICY "duels_insert" ON public.duels FOR INSERT
  WITH CHECK (auth.uid() = challenger_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.duels;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_duels_challenger  ON public.duels(challenger_id);
CREATE INDEX IF NOT EXISTS idx_duels_opponent    ON public.duels(opponent_id);
CREATE INDEX IF NOT EXISTS idx_duels_status      ON public.duels(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_duels_open        ON public.duels(created_at DESC) WHERE status = 'open';
