-- ============================================================
-- Migration : Flash Challenges
-- Tables    : flash_challenges, flash_challenge_claims
-- ============================================================

-- ─── Tables ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.flash_challenges (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id    uuid        NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  label       text        NOT NULL DEFAULT 'Défi Flash',
  bonus_coins integer     NOT NULL DEFAULT 100,
  starts_at   timestamptz NOT NULL DEFAULT now(),
  ends_at     timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- UNIQUE(user_id, challenge_id) prevents a user from claiming the same bonus twice
CREATE TABLE IF NOT EXISTS public.flash_challenge_claims (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES public.users(id)            ON DELETE CASCADE,
  challenge_id uuid        NOT NULL REFERENCES public.flash_challenges(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_id)
);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE public.flash_challenges       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flash_challenge_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fc_select"  ON public.flash_challenges;
CREATE POLICY "fc_select" ON public.flash_challenges
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "fcc_select" ON public.flash_challenge_claims;
CREATE POLICY "fcc_select" ON public.flash_challenge_claims
  FOR SELECT USING (auth.uid() = user_id);

-- ─── Realtime ─────────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.flash_challenges;

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_flash_challenges_match_id ON public.flash_challenges(match_id);
CREATE INDEX IF NOT EXISTS idx_flash_challenges_ends_at  ON public.flash_challenges(ends_at);
CREATE INDEX IF NOT EXISTS idx_fcc_user_id               ON public.flash_challenge_claims(user_id);
