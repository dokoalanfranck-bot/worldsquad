-- Présence utilisateurs : dernière activité vue
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- Index pour requêtes "qui est en ligne" (last_seen_at > now() - 5min)
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON public.users(last_seen_at DESC)
  WHERE last_seen_at IS NOT NULL;
