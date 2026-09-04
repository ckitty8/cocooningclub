-- Ajoute une adresse postale optionnelle aux ateliers, distincte du libellé
-- "lieu" affiché (ex: lieu = "Salle des fêtes", adresse = "12 rue des Lilas,
-- 75000 Paris"). Le front génère un lien de recherche Google Maps à partir
-- de cette adresse, cliquable par les visiteurs/membres.
ALTER TABLE public.ateliers ADD COLUMN adresse text;
