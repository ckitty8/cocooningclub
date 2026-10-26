-- Date de naissance de l'adhérente, saisie avec le bulletin d'adhésion.
--
-- Elle est portée par l'adhésion (comme le reste du bulletin) et non par la fiche du compte : la colonne
-- utilisateurs.date_naissance reste supprimée (minimisation, 20261024000002). Facultative : l'équipe
-- peut ne pas l'avoir au moment de la saisie. Lecture : administrateurs et la personne concernée
-- (politiques existantes de la table adhesions) ; écriture : administrateurs.

ALTER TABLE public.adhesions
  ADD COLUMN IF NOT EXISTS date_naissance DATE
    CHECK (date_naissance IS NULL OR date_naissance BETWEEN DATE '1900-01-01' AND DATE '2100-01-01');
