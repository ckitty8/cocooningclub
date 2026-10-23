-- RETOUR ARRIÈRE de migration-totale.sql (à n'utiliser qu'en cas de problème).
-- ATTENTION : supprime les formules, les adhésions et les bulletins enregistrés, ainsi que les
-- colonnes « commune » et « activité » des fiches. Les rôles déjà passés de « inscrit » à « membre »
-- par une validation d'adhésion ne sont pas remis en arrière. Faire une sauvegarde avant.
-- admin_dispo_le (20261023000009) reste réservée aux administrateurs : ce verrou n'est pas levé par le retour arrière.
-- Les tables de sauvegarde supprimées par 20261023000008 (6 inscriptions de test d'avril) ne sont PAS recréées.
-- Sans la fonction supprimer_membre, le bouton « Supprimer » de l'admin échoue : revenir aussi au code précédent.
BEGIN;
ALTER TABLE public.ateliers DROP COLUMN IF EXISTS tarif_adherent;
DROP TRIGGER  IF EXISTS trg_verifier_validation_impayee ON public.inscriptions;
DROP FUNCTION IF EXISTS private.bloquer_validation_impayee();
DROP FUNCTION IF EXISTS public.valider_sans_paiement(uuid, text);
-- Droits par offre : retour à la définition d'avant du déclencheur des inscriptions
-- (20261015000000 : « non_requis » seulement si le tarif est <= 0).
CREATE OR REPLACE FUNCTION private.proteger_inscriptions()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public, pg_catalog
AS $$
DECLARE
  v_tarif NUMERIC;
BEGIN
  IF NOT private.est_client_non_admin() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.utilisateur_id IS NOT NULL AND NEW.utilisateur_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Inscription non autorisée pour un autre compte.' USING ERRCODE = '42501';
    END IF;
    SELECT a.tarif_standard INTO v_tarif FROM public.ateliers a WHERE a.id = NEW.atelier_id;
    NEW.statut          := 'en_attente';
    NEW.statut_paiement := CASE WHEN v_tarif IS NOT NULL AND v_tarif <= 0 THEN 'non_requis' ELSE 'en_attente' END;
    NEW.present         := FALSE;
    NEW.annule_le       := NULL;
    NEW.inscrit_le      := now();
    RETURN NEW;
  END IF;
  IF NEW.statut <> 'annule'
  OR NEW.id              IS DISTINCT FROM OLD.id
  OR NEW.utilisateur_id  IS DISTINCT FROM OLD.utilisateur_id
  OR NEW.atelier_id      IS DISTINCT FROM OLD.atelier_id
  OR NEW.statut_paiement IS DISTINCT FROM OLD.statut_paiement
  OR NEW.present         IS DISTINCT FROM OLD.present
  OR NEW.inscrit_le      IS DISTINCT FROM OLD.inscrit_le
  THEN
    RAISE EXCEPTION 'Modification non autorisée : vous pouvez seulement annuler votre inscription.' USING ERRCODE = '42501';
  END IF;
  NEW.annule_le := COALESCE(OLD.annule_le, now());
  RETURN NEW;
END;
$$;
DROP FUNCTION IF EXISTS public.mon_droit_atelier(uuid);
DROP FUNCTION IF EXISTS public.atelier_inclus(uuid, uuid);
ALTER TABLE public.antennes DROP COLUMN IF EXISTS gratuit_pour_tous;
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
ALTER TABLE public.utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_sans_role_premium;
COMMIT;
