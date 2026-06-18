-- Feature flags : permet à l'admin de désactiver des modes depuis l'interface

CREATE TABLE IF NOT EXISTS public.feature_flags (
  key         TEXT PRIMARY KEY,
  enabled     BOOLEAN NOT NULL DEFAULT true,
  label       TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Désactiver RLS pour cette table (lecture publique, écriture service uniquement)
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads flags" ON public.feature_flags FOR SELECT USING (true);
CREATE POLICY "Service manages flags" ON public.feature_flags FOR ALL USING (auth.role() = 'service_role');

-- Flags initiaux
INSERT INTO public.feature_flags (key, enabled, label, description) VALUES
  ('battles_enabled',         true, 'Battles (Duels)', 'Active ou désactive les duels entre joueurs'),
  ('tournaments_enabled',     true, 'Tournois',         'Active ou désactive le mode tournoi 4 joueurs'),
  ('penalty_battles_enabled', true, 'Tirs au but',      'Active ou désactive les séances de tirs au but'),
  ('predictions_enabled',     true, 'Pronostics',       'Active ou désactive les pronostics de matchs')
ON CONFLICT (key) DO NOTHING;
