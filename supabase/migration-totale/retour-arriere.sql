-- RETOUR ARRIÈRE de migration-totale.sql (à n'utiliser qu'en cas de problème).
-- ATTENTION : supprime les formules, les adhésions et les bulletins enregistrés, ainsi que les
-- colonnes « commune » et « activité » des fiches. Les rôles déjà passés de « inscrit » à « membre »
-- par une validation d'adhésion ne sont pas remis en arrière. Faire une sauvegarde avant.
-- admin_dispo_le (20261023000009) reste réservée aux administrateurs : ce verrou n'est pas levé par le retour arrière.
-- decrement_atelier_spots (20261023000010), fonction morte, n'est pas recréée.
-- Les tables de sauvegarde supprimées par 20261023000008 (6 inscriptions de test d'avril) ne sont PAS recréées.
-- Sans la fonction supprimer_membre, le bouton « Supprimer » de l'admin échoue : revenir aussi au code précédent.
-- Si migration-deploiement.sql a été appliquée, lancer D'ABORD retour-arriere-deploiement.sql (sinon « antennes » n'existe plus).
-- Nettoyage premium / mot_de_passe_hash (20261024000000) : les valeurs d'enum retirées et la colonne vide ne sont PAS
-- recréées (inutilisées). Purge RGPD (20261024000001) : retirée ci-dessous (fonction et jobs pg_cron).
BEGIN;
DO $$
BEGIN
  IF to_regclass('cron.job') IS NOT NULL THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('purger_donnees_anciennes_daily', 'depublier_ateliers_passes_daily');
  END IF;
END
$$;
DROP FUNCTION IF EXISTS private.purger_donnees_anciennes();
-- Hobby du profil (20261027000000) : les hobbies saisis sont perdus.
ALTER TABLE public.utilisateurs DROP COLUMN IF EXISTS hobby;
-- Documents « admins » (20261026000003) : une valeur d'enum ne se retire pas. Les documents réservés aux administrateurs sont
-- repassés en « membres » (ils redeviennent visibles des membres : à vérifier avant de lancer) ; la valeur reste dans le type, sans effet.
UPDATE public.documents SET acces = 'membres' WHERE acces::text = 'admins';
-- Fiche reliée au compte en cascade (20261026000002) : les clés étrangères vers utilisateurs(id) redeviennent ON UPDATE NO ACTION
-- (un changement d'identifiant d'une fiche qui a des adhésions, inscriptions… sera de nouveau refusé).
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN SELECT conrelid::regclass AS table_ref, conname, regexp_replace(pg_get_constraintdef(oid), ' ON UPDATE CASCADE', '') AS def
             FROM pg_constraint WHERE confrelid = 'public.utilisateurs'::regclass AND contype = 'f' AND confupdtype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', c.table_ref, c.conname);
    EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I %s', c.table_ref, c.conname, c.def);
  END LOOP;
END $$;
-- Date de naissance du bulletin (20261026000001) : les dates saisies sont perdues.
ALTER TABLE public.adhesions DROP COLUMN IF EXISTS date_naissance;
-- « Pas de membre sans adhésion » (20261026000000) : le rôle Membre peut de nouveau être attribué sans adhésion.
DROP TRIGGER IF EXISTS trg_utilisateurs_membre_exige_adhesion ON public.utilisateurs;
DROP FUNCTION IF EXISTS private.exiger_adhesion_pour_membre();
-- Filet de sécurité des pré-inscriptions (20261025000000) : supprime les demandes de secours encore non traitées.
DROP TABLE IF EXISTS public.pre_inscriptions_secours;
-- Droit à l'image et WhatsApp de la pré-inscription (20261025000001) : les réponses déjà données sont perdues.
DROP TRIGGER IF EXISTS trg_dater_consentements_inscription ON public.inscriptions;
DROP FUNCTION IF EXISTS private.dater_consentements_inscription();
ALTER TABLE public.inscriptions DROP COLUMN IF EXISTS autorisation_image, DROP COLUMN IF EXISTS accord_whatsapp, DROP COLUMN IF EXISTS consentements_le;
DROP FUNCTION IF EXISTS private.preparer_pre_inscription_secours();
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
