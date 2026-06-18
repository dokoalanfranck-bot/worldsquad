-- Vue agrégée pour le classement cartes — évite le fetch de toutes les lignes en JS
CREATE OR REPLACE VIEW public.user_card_counts AS
SELECT
  uc.user_id,
  COUNT(*)                    AS total_cards,
  COUNT(DISTINCT uc.card_id)  AS unique_cards
FROM public.user_cards uc
  JOIN public.users u ON u.id = uc.user_id
WHERE u.is_admin = false
GROUP BY uc.user_id;
