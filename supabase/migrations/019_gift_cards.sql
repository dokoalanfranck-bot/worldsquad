-- Ajoute 'admin_gift' et 'penalty_battle' aux valeurs autorisées pour obtained_via
ALTER TABLE public.user_cards
  DROP CONSTRAINT IF EXISTS user_cards_obtained_via_check;

ALTER TABLE public.user_cards
  ADD CONSTRAINT user_cards_obtained_via_check
  CHECK (obtained_via IN ('pack','battle','event','purchase','signup','admin_gift','penalty_battle'));
