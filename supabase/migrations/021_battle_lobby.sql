-- ── Lobby table ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.battle_lobby (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mode       TEXT NOT NULL DEFAULT 'duel' CHECK (mode IN ('duel', 'penalty')),
  entered_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.battle_lobby ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read lobby"    ON public.battle_lobby FOR SELECT USING (true);
CREATE POLICY "Service can manage lobby" ON public.battle_lobby FOR ALL    USING (auth.role() = 'service_role');

ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_lobby;

-- ── Add 'invited' to duels ────────────────────────────────────────────────────
ALTER TABLE public.duels DROP CONSTRAINT IF EXISTS duels_status_check;
ALTER TABLE public.duels ADD CONSTRAINT duels_status_check
  CHECK (status IN ('invited','open','picking','stealing','finished','cancelled'));

-- ── Add 'invited' + bot support to penalty_battles ───────────────────────────
ALTER TABLE public.penalty_battles DROP CONSTRAINT IF EXISTS penalty_battles_status_check;
ALTER TABLE public.penalty_battles ADD CONSTRAINT penalty_battles_status_check
  CHECK (status IN ('invited','waiting','picking','active','stealing','finished','cancelled'));

ALTER TABLE public.penalty_battles
  ADD COLUMN IF NOT EXISTS is_bot   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bot_name TEXT;

-- ── Update pg_cron cleanup (replace existing job) ────────────────────────────
SELECT cron.unschedule('worldsquad-battle-cleanup');

SELECT cron.schedule(
  'worldsquad-battle-cleanup',
  '* * * * *',
  $cron$
  -- Clean lobby entries older than 5 min
  DELETE FROM public.battle_lobby WHERE entered_at < now() - interval '5 minutes';

  -- Cancel stale invited duels (no response after 2 min)
  UPDATE public.duels SET status = 'cancelled'
  WHERE status = 'invited' AND created_at < now() - interval '2 minutes';

  -- Cancel stale invited penalty battles
  UPDATE public.penalty_battles SET status = 'cancelled'
  WHERE status = 'invited' AND created_at < now() - interval '2 minutes';

  -- Cancel open duels with no opponent after 65s
  UPDATE public.duels
  SET status = 'cancelled', cancelled_reason = 'no_opponent'
  WHERE status = 'open' AND is_bot = false AND opponent_id IS NULL
    AND created_at < now() - interval '65 seconds';

  -- Cancel waiting penalty battles with no opponent after 65s
  UPDATE public.penalty_battles
  SET status = 'cancelled', cancelled_reason = 'no_opponent'
  WHERE status = 'waiting' AND is_bot = false AND opponent_id IS NULL
    AND created_at < now() - interval '65 seconds';

  -- Cancel picking-expired duels
  UPDATE public.duels
  SET status = 'cancelled', cancelled_reason = 'picking_timeout'
  WHERE status = 'picking' AND picks_deadline IS NOT NULL
    AND picks_deadline < now() - interval '5 seconds';

  -- Cancel picking-expired penalty battles
  UPDATE public.penalty_battles
  SET status = 'cancelled', cancelled_reason = 'picking_timeout'
  WHERE status = 'picking' AND picks_deadline IS NOT NULL
    AND picks_deadline < now() - interval '5 seconds';
  $cron$
);
