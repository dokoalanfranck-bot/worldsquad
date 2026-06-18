-- ── Top 3 daily rewards ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.top3_rewards (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rank         INT  NOT NULL CHECK (rank IN (1, 2, 3)),
  coins_awarded INT NOT NULL,
  period_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (user_id, period_date)
);

ALTER TABLE public.top3_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read top3_rewards" ON public.top3_rewards FOR SELECT USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.top3_rewards;

-- ── Daily cron: midnight UTC ─────────────────────────────────────────────────
SELECT cron.schedule(
  'worldsquad-top3-daily-rewards',
  '0 0 * * *',
  $cron$
  WITH top3 AS (
    SELECT id,
           ROW_NUMBER() OVER (ORDER BY battles_won DESC, battle_streak DESC, battles_played DESC)::int AS rank
    FROM public.users
    WHERE battles_won > 0 AND is_admin = false
    LIMIT 3
  ),
  amounts AS (
    SELECT id, rank,
           CASE rank WHEN 1 THEN 300 WHEN 2 THEN 200 ELSE 100 END AS coins
    FROM top3
  ),
  inserted AS (
    INSERT INTO public.top3_rewards (user_id, rank, coins_awarded, period_date)
    SELECT id, rank, coins, CURRENT_DATE FROM amounts
    ON CONFLICT (user_id, period_date) DO NOTHING
    RETURNING user_id, coins_awarded
  )
  UPDATE public.users u SET coins = u.coins + i.coins_awarded
  FROM inserted i WHERE u.id = i.user_id;
  $cron$
);
