-- Profil de la membre : champ « Hobby » (l'« Activité principale » est la colonne utilisateurs.activite, déjà présente
-- depuis 20261023000003 et saisie avec le bulletin d'adhésion). Facultatif, modifiable par la membre depuis
-- « Mon compte » (politiques existantes de la table utilisateurs).

ALTER TABLE public.utilisateurs
  ADD COLUMN IF NOT EXISTS hobby TEXT CHECK (hobby IS NULL OR length(hobby) <= 200);
