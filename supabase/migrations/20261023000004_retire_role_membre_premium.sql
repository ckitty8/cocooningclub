-- =====================================================
-- Suppression du rôle « membre premium »
-- =====================================================
-- Les droits liés aux offres (Business, Créatif, Complet) passent par l'adhésion et sa formule
-- (tables formules, formule_espaces, adhesions) et non par un rôle : « membre premium » n'a plus
-- d'objet. Aucun compte ne l'a (vérifié en production), aucune politique ni fonction ne le cite.
--
-- PostgreSQL ne sait pas retirer une valeur d'un type énuméré sans reconstruire le type, ce qui
-- obligerait à supprimer puis recréer toutes les politiques de sécurité qui lisent la colonne
-- utilisateurs.role : risque disproportionné. La valeur reste donc dans le type, inutilisable :
-- cette contrainte interdit de l'attribuer à un compte.

ALTER TABLE public.utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_sans_role_premium;
ALTER TABLE public.utilisateurs
  ADD CONSTRAINT utilisateurs_sans_role_premium CHECK (role::text <> 'membre_premium');
