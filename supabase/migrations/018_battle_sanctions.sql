-- Migration 018 — Système de sanctions pour abandons en battle

-- Colonnes sur users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS abandon_count    INT         NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS battle_ban_until TIMESTAMPTZ;

-- Colonnes sur duels
ALTER TABLE public.duels
  ADD COLUMN IF NOT EXISTS cancelled_reason TEXT;

-- Colonnes sur penalty_battles
ALTER TABLE public.penalty_battles
  ADD COLUMN IF NOT EXISTS cancelled_reason TEXT;

-- Index pour les requêtes de cleanup
CREATE INDEX IF NOT EXISTS idx_duels_cleanup
  ON public.duels (status, created_at)
  WHERE status IN ('open', 'picking');

CREATE INDEX IF NOT EXISTS idx_penalty_cleanup
  ON public.penalty_battles (status, created_at)
  WHERE status IN ('waiting', 'picking');

-- ──────────────────────────────────────────────────────────────────────────────
-- pg_cron (optionnel — activer l'extension dans Supabase si dispo)
-- Exécuter ces lignes manuellement dans le SQL Editor si pg_cron est disponible
-- ──────────────────────────────────────────────────────────────────────────────

-- SELECT cron.unschedule('worldsquad-battle-cleanup');

-- SELECT cron.schedule(
--   'worldsquad-battle-cleanup',
--   '* * * * *',   -- toutes les minutes
--   $$
--     -- 1. Annuler les duels open sans adversaire depuis > 65s
--     UPDATE public.duels
--     SET status = 'cancelled', cancelled_reason = 'no_opponent'
--     WHERE status = 'open'
--       AND is_bot = false
--       AND opponent_id IS NULL
--       AND created_at < now() - INTERVAL '65 seconds';
--
--     -- 2. Annuler les penalty battles en waiting depuis > 65s
--     UPDATE public.penalty_battles
--     SET status = 'cancelled', cancelled_reason = 'no_opponent'
--     WHERE status = 'waiting'
--       AND opponent_id IS NULL
--       AND created_at < now() - INTERVAL '65 seconds';
--
--     -- 3. Pénaliser + annuler les duels dont le picks_deadline est expiré
--     WITH cancelled AS (
--       UPDATE public.duels
--       SET status = 'cancelled', cancelled_reason = 'picking_timeout'
--       WHERE status = 'picking'
--         AND is_bot = false
--         AND picks_deadline IS NOT NULL
--         AND picks_deadline < now() - INTERVAL '5 seconds'
--       RETURNING challenger_id, opponent_id, challenger_picks, opponent_picks
--     )
--     UPDATE public.users u
--     SET abandon_count = CASE
--           WHEN u.abandon_count + 1 >= 3 THEN 0
--           ELSE u.abandon_count + 1
--         END,
--         battle_ban_until = CASE
--           WHEN u.abandon_count + 1 >= 3 THEN now() + INTERVAL '30 minutes'
--           ELSE u.battle_ban_until
--         END
--     FROM cancelled c
--     WHERE (c.challenger_picks IS NULL AND u.id = c.challenger_id)
--        OR (c.opponent_picks  IS NULL AND c.opponent_id IS NOT NULL AND u.id = c.opponent_id);
--
--     -- 4. Pénaliser + annuler les penalty_battles dont le picks_deadline est expiré
--     WITH cancelled AS (
--       UPDATE public.penalty_battles
--       SET status = 'cancelled', cancelled_reason = 'picking_timeout'
--       WHERE status = 'picking'
--         AND picks_deadline IS NOT NULL
--         AND picks_deadline < now() - INTERVAL '5 seconds'
--       RETURNING challenger_id, opponent_id, challenger_picks, opponent_picks
--     )
--     UPDATE public.users u
--     SET abandon_count = CASE
--           WHEN u.abandon_count + 1 >= 3 THEN 0
--           ELSE u.abandon_count + 1
--         END,
--         battle_ban_until = CASE
--           WHEN u.abandon_count + 1 >= 3 THEN now() + INTERVAL '30 minutes'
--           ELSE u.battle_ban_until
--         END
--     FROM cancelled c
--     WHERE (c.challenger_picks IS NULL AND u.id = c.challenger_id)
--        OR (c.opponent_picks  IS NULL AND c.opponent_id IS NOT NULL AND u.id = c.opponent_id);
--   $$
-- );
