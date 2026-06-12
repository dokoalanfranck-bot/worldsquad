-- Add is_bot flag to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_bot BOOLEAN NOT NULL DEFAULT FALSE;

-- Bot users are not subject to the standard RLS constraint
-- (they are inserted via service role in the setup endpoint)

-- Index for bot filtering
CREATE INDEX IF NOT EXISTS idx_users_is_bot ON public.users(is_bot) WHERE is_bot = TRUE;

-- Make sure leaderboard-style queries can filter bots
-- (leaderboard queries should add WHERE is_bot = FALSE)
