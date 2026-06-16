-- Migration 016 — Mode Tirs au but (penalty battles)

CREATE TABLE IF NOT EXISTS public.penalty_battles (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opponent_id             UUID REFERENCES users(id) ON DELETE CASCADE,
  status                  TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'active', 'finished', 'cancelled')),

  -- Cartes misées (user_cards.id — instance spécifique)
  challenger_wager        UUID,
  opponent_wager          UUID,

  -- État du match
  current_round           INTEGER NOT NULL DEFAULT 1,
  challenger_score        INTEGER NOT NULL DEFAULT 0,
  opponent_score          INTEGER NOT NULL DEFAULT 0,
  rounds                  JSONB NOT NULL DEFAULT '[]',
  round_deadline          TIMESTAMPTZ,

  -- Panenka (1 par joueur par match)
  challenger_used_panenka BOOLEAN NOT NULL DEFAULT false,
  opponent_used_panenka   BOOLEAN NOT NULL DEFAULT false,

  winner_id               UUID REFERENCES users(id),
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

-- Choix courant par tour (secret côté adversaire)
CREATE TABLE IF NOT EXISTS public.penalty_choices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id     UUID NOT NULL REFERENCES penalty_battles(id) ON DELETE CASCADE,
  round_number  INTEGER NOT NULL,
  player_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  choice        TEXT NOT NULL CHECK (choice IN ('left', 'center', 'right', 'panenka')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (battle_id, round_number, player_id)
);

-- RLS
ALTER TABLE public.penalty_battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penalty_choices  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "penalty_battles_select" ON public.penalty_battles;
CREATE POLICY "penalty_battles_select" ON public.penalty_battles
  FOR SELECT USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

DROP POLICY IF EXISTS "penalty_choices_insert" ON public.penalty_choices;
CREATE POLICY "penalty_choices_insert" ON public.penalty_choices
  FOR INSERT WITH CHECK (auth.uid() = player_id);

DROP POLICY IF EXISTS "penalty_choices_select" ON public.penalty_choices;
CREATE POLICY "penalty_choices_select" ON public.penalty_choices
  FOR SELECT USING (auth.uid() = player_id);

-- Realtime
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'penalty_battles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.penalty_battles;
  END IF;
END $$;
