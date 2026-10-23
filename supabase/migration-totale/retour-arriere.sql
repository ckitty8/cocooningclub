-- RETOUR ARRIÈRE de migration-totale.sql (à n'utiliser qu'en cas de problème).
-- ATTENTION : supprime les formules, les adhésions et les bulletins enregistrés, ainsi que les
-- colonnes « commune » et « activité » des fiches. Les rôles déjà passés de « inscrit » à « membre »
-- par une validation d'adhésion ne sont pas remis en arrière. Faire une sauvegarde avant.
-- Sans la fonction supprimer_membre, le bouton « Supprimer » de l'admin échoue : revenir aussi au code précédent.
BEGIN;
DROP POLICY   IF EXISTS formules_lecture_adherente ON public.formules;
DROP VIEW     IF EXISTS public.vue_autorisation_image;
DROP FUNCTION IF EXISTS public.valider_adhesion(uuid, text, date, date);
DROP FUNCTION IF EXISTS public.expirer_adhesions();
DROP FUNCTION IF EXISTS public.supprimer_membre(uuid);
DROP TABLE    IF EXISTS public.adhesions;
DROP FUNCTION IF EXISTS private.fixer_montant_adhesion();
DROP TABLE    IF EXISTS public.formule_espaces;
DROP TABLE    IF EXISTS public.formules;
DROP SEQUENCE IF EXISTS public.adhesions_numero_seq;
ALTER TABLE public.utilisateurs DROP COLUMN IF EXISTS commune, DROP COLUMN IF EXISTS activite;
COMMIT;
