-- Ajoute une colonne numérique pour le calcul du montant total
-- Distincte de la colonne "price" (texte d'affichage front)
-- Alimentée par les administrateurs, non exposée sur le front
ALTER TABLE public.ateliers
  ADD COLUMN price_amount NUMERIC(10, 2) DEFAULT 0;

COMMENT ON COLUMN public.ateliers.price_amount IS 'Montant réel en euros pour le calcul du CA. Géré par les admins uniquement. Ne pas afficher sur le front.';
