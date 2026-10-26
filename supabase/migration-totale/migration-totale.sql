-- =====================================================================
-- MIGRATION TOTALE DU SITE : à coller dans le SQL Editor de Supabase.
-- Fichier généré par `npm run migration:build` : ne pas le modifier à la main.
-- Tout est exécuté dans une seule transaction : en cas d'erreur, rien n'est appliqué.
-- Contient : 20261023000002_supprime_membre_et_compte.sql, 20261023000003_offre_et_adhesions.sql, 20261023000004_retire_role_membre_premium.sql, 20261023000005_droits_par_offre.sql, 20261023000006_bloque_validation_impayee.sql, 20261023000007_tarif_adherente.sql, 20261023000008_supprime_tables_de_sauvegarde.sql, 20261023000009_reserve_admin_dispo_aux_admins.sql, 20261023000010_supprime_decrement_atelier_spots.sql, 20261024000000_nettoyage_premium_et_mot_de_passe_hash.sql, 20261024000001_conservation_des_donnees.sql, 20261025000000_pre_inscriptions_secours.sql, 20261025000001_consentements_pre_inscription.sql, 20261026000000_membre_exige_adhesion.sql
-- Lancer ensuite verifications.sql (tout doit afficher ok = true).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 20261023000002_supprime_membre_et_compte.sql
-- ---------------------------------------------------------------------
-- Suppression d'un membre depuis l'espace admin : supprime aussi son compte de
-- connexion (auth.users). Avant, seule la ligne public.utilisateurs partait et
-- la personne pouvait toujours se connecter.
--
-- Réservé aux administrateurs actifs ; on ne peut pas se supprimer soi-même.
-- Utilise private.utilisateur_est_admin() (et non private.is_admin(), absent en prod).

CREATE OR REPLACE FUNCTION public.supprimer_membre(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT private.utilisateur_est_admin() THEN
    RAISE EXCEPTION 'Action réservée aux administrateurs' USING ERRCODE = '42501';
  END IF;
  IF p_id = auth.uid() THEN
    RAISE EXCEPTION 'Vous ne pouvez pas supprimer votre propre compte' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.utilisateurs WHERE id = p_id;
  DELETE FROM auth.users WHERE id = p_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.supprimer_membre(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.supprimer_membre(uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- 20261023000003_offre_et_adhesions.sql
-- ---------------------------------------------------------------------
-- =====================================================
-- Offre du club (formules d'adhésion) et suivi des adhésions
-- =====================================================
-- D'après le bulletin d'adhésion de l'association :
--   * des formules configurables par les administrateurs (nom, prix, durée en
--     mois, espaces inclus, lien HelloAsso, modes de règlement) ;
--   * des adhésions : formule choisie, mode de règlement, cotisation reçue le,
--     date de validation, valable jusqu'au, numéro d'adhérente ;
--   * la validation d'une adhésion fait passer une personne `inscrit` en `membre`
--     (fonction valider_adhesion) ; à l'échéance elle redevient `inscrit`
--     (fonction expirer_adhesions).
--
-- Le bulletin d'adhésion (engagement, WhatsApp, autorisation photo et vidéo) est
-- enregistré UNE SEULE FOIS, sur l'adhésion. Les coordonnées restent sur la fiche
-- de la personne (utilisateurs) et les inscriptions aux ateliers pointent vers elle :
-- le consentement photo d'une personne s'obtient par relation
-- (inscriptions -> utilisateurs -> adhesions), jamais par recopie. La vue
-- vue_autorisation_image donne le dernier bulletin de chaque personne.
--
-- Les droits d'accès par adhésion sont gérés côté site. Les membres existants
-- (rôle `membre` sans adhésion enregistrée) ne sont JAMAIS rétrogradés : seule
-- une personne qui a eu une adhésion active, aujourd'hui entièrement échue,
-- repasse `inscrit`.
-- Utilise private.utilisateur_est_admin() (et non private.is_admin(), absent en prod).

CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

-- ─────────────────────────────────────────────
-- 0. Coordonnées du bulletin absentes de la fiche (facultatives)
-- ─────────────────────────────────────────────
ALTER TABLE public.utilisateurs
  ADD COLUMN IF NOT EXISTS commune  TEXT CHECK (commune  IS NULL OR length(commune)  <= 100),
  ADD COLUMN IF NOT EXISTS activite TEXT CHECK (activite IS NULL OR length(activite) <= 150);

-- ─────────────────────────────────────────────
-- 1. Formules
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.formules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom             TEXT NOT NULL CHECK (length(btrim(nom)) BETWEEN 1 AND 80),
  description     TEXT CHECK (description IS NULL OR length(description) <= 500),
  couleur         TEXT NOT NULL DEFAULT 'terracotta'
                    CHECK (couleur IN ('mauve', 'sauge', 'terracotta', 'rose', 'bleu', 'ocre')),
  prix            NUMERIC(8,2) NOT NULL CHECK (prix >= 0),
  duree_mois      INTEGER NOT NULL DEFAULT 12 CHECK (duree_mois BETWEEN 1 AND 60),
  lien_helloasso  TEXT CHECK (lien_helloasso IS NULL OR lien_helloasso ~* '^https://'),
  modes_reglement TEXT[] NOT NULL DEFAULT ARRAY['en_ligne', 'virement', 'especes']
                    CHECK (modes_reglement <@ ARRAY['en_ligne', 'virement', 'especes']),
  est_active      BOOLEAN NOT NULL DEFAULT TRUE,
  ordre           INTEGER NOT NULL DEFAULT 0,
  cree_le         TIMESTAMPTZ NOT NULL DEFAULT now(),
  modifie_le      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.formule_espaces (
  formule_id UUID NOT NULL REFERENCES public.formules(id) ON DELETE CASCADE,
  antenne_id UUID NOT NULL REFERENCES public.antennes(id) ON DELETE CASCADE,
  PRIMARY KEY (formule_id, antenne_id)
);

DROP TRIGGER IF EXISTS trg_formules_modifie_le ON public.formules;
CREATE TRIGGER trg_formules_modifie_le
  BEFORE UPDATE ON public.formules
  FOR EACH ROW EXECUTE FUNCTION public.maj_modifie_le();

-- ─────────────────────────────────────────────
-- 2. Adhésions
-- ─────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.adhesions_numero_seq START 1;

CREATE TABLE IF NOT EXISTS public.adhesions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero             INTEGER NOT NULL UNIQUE DEFAULT nextval('public.adhesions_numero_seq'),
  utilisateur_id     UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  formule_id         UUID NOT NULL REFERENCES public.formules(id) ON DELETE RESTRICT,
  statut             TEXT NOT NULL DEFAULT 'en_attente'
                       CHECK (statut IN ('en_attente', 'active', 'refusee')),
  mode_reglement     TEXT NOT NULL DEFAULT 'virement'
                       CHECK (mode_reglement IN ('en_ligne', 'virement', 'especes')),
  montant            NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (montant >= 0),
  cotisation_recue_le DATE,
  date_validation    DATE,
  valable_jusqu_au   DATE,
  -- Bulletin : engagement (statuts et règlement intérieur), WhatsApp, autorisation photo et vidéo.
  engagement_accepte_le DATE,
  whatsapp           BOOLEAN NOT NULL DEFAULT FALSE,
  autorisation_image BOOLEAN NOT NULL DEFAULT FALSE,
  image_supports     TEXT[] NOT NULL DEFAULT '{}'
                       CHECK (image_supports <@ ARRAY['reseaux', 'site', 'imprimes', 'interne']),
  image_signee_le    DATE,
  cree_le            TIMESTAMPTZ NOT NULL DEFAULT now(),
  modifie_le         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (statut <> 'active' OR (date_validation IS NOT NULL AND valable_jusqu_au IS NOT NULL)),
  CHECK (NOT autorisation_image OR image_signee_le IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_adhesions_utilisateur ON public.adhesions(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_adhesions_formule     ON public.adhesions(formule_id);
CREATE INDEX IF NOT EXISTS idx_adhesions_statut      ON public.adhesions(statut, valable_jusqu_au);

DROP TRIGGER IF EXISTS trg_adhesions_modifie_le ON public.adhesions;
CREATE TRIGGER trg_adhesions_modifie_le
  BEFORE UPDATE ON public.adhesions
  FOR EACH ROW EXECUTE FUNCTION public.maj_modifie_le();

-- Le montant est celui de la formule au moment de la demande (jamais saisi par le client).
CREATE OR REPLACE FUNCTION private.fixer_montant_adhesion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  SELECT prix INTO NEW.montant FROM public.formules WHERE id = NEW.formule_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_adhesions_montant ON public.adhesions;
CREATE TRIGGER trg_adhesions_montant
  BEFORE INSERT ON public.adhesions
  FOR EACH ROW EXECUTE FUNCTION private.fixer_montant_adhesion();

-- ─────────────────────────────────────────────
-- 3. Droits d'accès (RLS)
-- ─────────────────────────────────────────────
ALTER TABLE public.formules        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formule_espaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adhesions       ENABLE ROW LEVEL SECURITY;

-- Formules : les tarifs actifs sont publics (page d'adhésion), tout est modifiable par les admins.
DROP POLICY IF EXISTS formules_lecture_publique ON public.formules;
CREATE POLICY formules_lecture_publique ON public.formules
  FOR SELECT TO anon, authenticated USING (est_active);

-- Une adhérente garde accès à la formule de ses adhésions, même si elle n'est plus proposée.
DROP POLICY IF EXISTS formules_lecture_adherente ON public.formules;
CREATE POLICY formules_lecture_adherente ON public.formules
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.adhesions a
                  WHERE a.formule_id = formules.id AND a.utilisateur_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS formules_admin ON public.formules;
CREATE POLICY formules_admin ON public.formules
  FOR ALL TO authenticated
  USING (private.utilisateur_est_admin()) WITH CHECK (private.utilisateur_est_admin());

DROP POLICY IF EXISTS formule_espaces_lecture_publique ON public.formule_espaces;
CREATE POLICY formule_espaces_lecture_publique ON public.formule_espaces
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS formule_espaces_admin ON public.formule_espaces;
CREATE POLICY formule_espaces_admin ON public.formule_espaces
  FOR ALL TO authenticated
  USING (private.utilisateur_est_admin()) WITH CHECK (private.utilisateur_est_admin());

-- Adhésions : chacune voit les siennes, les admins gèrent tout.
DROP POLICY IF EXISTS adhesions_lecture_soi ON public.adhesions;
CREATE POLICY adhesions_lecture_soi ON public.adhesions
  FOR SELECT TO authenticated USING (utilisateur_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS adhesions_admin ON public.adhesions;
CREATE POLICY adhesions_admin ON public.adhesions
  FOR ALL TO authenticated
  USING (private.utilisateur_est_admin()) WITH CHECK (private.utilisateur_est_admin());

GRANT SELECT ON public.formules, public.formule_espaces TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.formules, public.formule_espaces, public.adhesions TO authenticated;
GRANT USAGE ON SEQUENCE public.adhesions_numero_seq TO authenticated;

-- ─────────────────────────────────────────────
-- 3 bis. Autorisation photo et vidéo en vigueur, par personne
-- ─────────────────────────────────────────────
-- Dernier bulletin non refusé de chaque personne. L'autorisation vaut 3 ans à compter
-- de la signature (bulletin). Vue en security_invoker : les droits de la table
-- adhesions s'appliquent (une adhérente ne voit que la sienne, les admins voient tout).
CREATE OR REPLACE VIEW public.vue_autorisation_image
WITH (security_invoker = true) AS
SELECT DISTINCT ON (a.utilisateur_id)
  a.utilisateur_id,
  a.id AS adhesion_id,
  a.autorisation_image,
  a.image_supports,
  a.image_signee_le,
  (a.image_signee_le + INTERVAL '3 years')::DATE AS image_valable_jusqu_au,
  (a.autorisation_image
     AND a.image_signee_le IS NOT NULL
     AND (a.image_signee_le + INTERVAL '3 years')::DATE >= CURRENT_DATE) AS image_valide
FROM public.adhesions a
WHERE a.statut <> 'refusee'
ORDER BY a.utilisateur_id, a.cree_le DESC;

GRANT SELECT ON public.vue_autorisation_image TO authenticated;

-- ─────────────────────────────────────────────
-- 4. Validation d'une adhésion (réservée aux admins)
-- ─────────────────────────────────────────────
-- Fixe les dates (valable_jusqu_au = validation + durée de la formule), passe la
-- personne de `inscrit` à `membre` et reporte les dates sur son profil.
CREATE OR REPLACE FUNCTION public.valider_adhesion(
  p_id         UUID,
  p_mode       TEXT,
  p_recue_le   DATE DEFAULT NULL,
  p_validation DATE DEFAULT NULL
)
RETURNS public.adhesions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_adhesion public.adhesions;
  v_duree    INTEGER;
  v_debut    DATE := COALESCE(p_validation, CURRENT_DATE);
  v_fin      DATE;
BEGIN
  IF NOT private.utilisateur_est_admin() THEN
    RAISE EXCEPTION 'Action réservée aux administrateurs' USING ERRCODE = '42501';
  END IF;
  IF p_mode NOT IN ('en_ligne', 'virement', 'especes') THEN
    RAISE EXCEPTION 'Mode de règlement inconnu' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_adhesion FROM public.adhesions WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Adhésion introuvable' USING ERRCODE = 'P0002';
  END IF;
  IF v_adhesion.statut <> 'en_attente' THEN
    RAISE EXCEPTION 'Cette adhésion a déjà été traitée' USING ERRCODE = '22023';
  END IF;
  SELECT duree_mois INTO v_duree FROM public.formules WHERE id = v_adhesion.formule_id;

  v_fin := (v_debut + make_interval(months => v_duree))::DATE;

  UPDATE public.adhesions
     SET statut = 'active', mode_reglement = p_mode, cotisation_recue_le = p_recue_le,
         date_validation = v_debut, valable_jusqu_au = v_fin
   WHERE id = p_id
   RETURNING * INTO v_adhesion;

  -- SECURITY DEFINER : le déclencheur qui protège le rôle ne bloque pas cette mise à jour.
  UPDATE public.utilisateurs
     SET role = CASE WHEN role = 'inscrit' THEN 'membre'::role_utilisateur ELSE role END,
         debut_abonnement = v_debut,
         fin_abonnement = v_fin
   WHERE id = v_adhesion.utilisateur_id
     AND role <> 'administrateur';

  RETURN v_adhesion;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.valider_adhesion(UUID, TEXT, DATE, DATE) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.valider_adhesion(UUID, TEXT, DATE, DATE) TO authenticated;

-- ─────────────────────────────────────────────
-- 5. Échéance : une adhésion échue ramène la personne à `inscrit`
-- ─────────────────────────────────────────────
-- Appelée depuis l'écran « Offre & adhésions ». Ne touche que les comptes `membre`
-- qui ont eu au moins une adhésion active et n'en ont plus aucune en cours.
CREATE OR REPLACE FUNCTION public.expirer_adhesions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_nb INTEGER;
BEGIN
  IF NOT private.utilisateur_est_admin() THEN
    RAISE EXCEPTION 'Action réservée aux administrateurs' USING ERRCODE = '42501';
  END IF;

  UPDATE public.utilisateurs u
     SET role = 'inscrit'
   WHERE u.role = 'membre'
     AND EXISTS (SELECT 1 FROM public.adhesions a
                  WHERE a.utilisateur_id = u.id AND a.statut = 'active')
     AND NOT EXISTS (SELECT 1 FROM public.adhesions a
                      WHERE a.utilisateur_id = u.id AND a.statut = 'active'
                        AND a.valable_jusqu_au >= CURRENT_DATE);
  GET DIAGNOSTICS v_nb = ROW_COUNT;
  RETURN v_nb;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.expirer_adhesions() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.expirer_adhesions() TO authenticated;

-- ─────────────────────────────────────────────
-- 6. Les trois formules du bulletin d'adhésion (une seule fois)
-- ─────────────────────────────────────────────
DO $$
DECLARE
  v_business UUID;
  v_creatif  UUID;
  v_complet  UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM public.formules) THEN
    RETURN;
  END IF;

  INSERT INTO public.formules (nom, description, couleur, prix, ordre) VALUES
    ('Cocooning Business', 'Coworking, entraide et projets qui avancent.', 'mauve', 100, 1)
    RETURNING id INTO v_business;
  INSERT INTO public.formules (nom, description, couleur, prix, ordre) VALUES
    ('Cocooning Créatif', 'Ateliers créatifs, rencontres et moments de partage.', 'sauge', 80, 2)
    RETURNING id INTO v_creatif;
  INSERT INTO public.formules (nom, description, couleur, prix, ordre) VALUES
    ('Cocooning Complet', 'Les deux univers réunis dans une seule adhésion.', 'terracotta', 150, 3)
    RETURNING id INTO v_complet;

  INSERT INTO public.formule_espaces (formule_id, antenne_id)
    SELECT v_business, id FROM public.antennes WHERE slug = 'business';
  INSERT INTO public.formule_espaces (formule_id, antenne_id)
    SELECT v_creatif, id FROM public.antennes WHERE slug = 'creatifs';
  INSERT INTO public.formule_espaces (formule_id, antenne_id)
    SELECT v_complet, id FROM public.antennes WHERE slug IN ('business', 'creatifs');
END;
$$;

-- ---------------------------------------------------------------------
-- 20261023000004_retire_role_membre_premium.sql
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 20261023000005_droits_par_offre.sql
-- ---------------------------------------------------------------------
-- Droits par offre : un atelier est gratuit, inclus dans l'adhésion ou à payer.
--
-- Règle (identique à src/lib/droits.ts) :
--   1. tarif de l'atelier <= 0                          -> gratuit
--   2. espace de l'atelier « gratuit pour tous »        -> gratuit (Papotages)
--   3. adhésion active non échue dont la formule couvre l'espace de l'atelier -> inclus
--   4. sinon                                            -> à payer (tarif non renseigné = à payer)
-- Le rôle (inscrit / membre / administrateur) ne décide que de l'accès aux pages, jamais des droits.
--
-- Dépend de 20261023000003 (tables formules, formule_espaces, adhesions).

ALTER TABLE public.antennes
  ADD COLUMN IF NOT EXISTS gratuit_pour_tous BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.antennes SET gratuit_pour_tous = TRUE WHERE slug = 'papotages';


-- L'atelier est-il gratuit ou inclus pour cette personne ?
-- p_utilisateur NULL (invité sans compte) : seulement gratuit.
-- Appelable par le déclencheur des inscriptions (qui s'exécute avec les droits de la personne
-- connectée ou du visiteur) : l'adhésion d'une autre personne n'est donc jamais révélée, la
-- fonction répond alors comme s'il n'y en avait pas (sauf pour un administrateur).
CREATE OR REPLACE FUNCTION public.atelier_inclus(p_utilisateur UUID, p_atelier UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT COALESCE((
    SELECT
      (a.tarif_standard IS NOT NULL AND a.tarif_standard <= 0)
      OR COALESCE(an.gratuit_pour_tous, FALSE)
      OR (
        p_utilisateur IS NOT NULL
        AND (p_utilisateur = auth.uid() OR private.utilisateur_est_admin())
        AND EXISTS (
          SELECT 1
          FROM public.adhesions ad
          JOIN public.formule_espaces fe ON fe.formule_id = ad.formule_id
          WHERE ad.utilisateur_id = p_utilisateur
            AND ad.statut = 'active'
            AND ad.valable_jusqu_au >= current_date
            AND fe.antenne_id = a.antenne_id
        )
      )
    FROM public.ateliers a
    LEFT JOIN public.antennes an ON an.id = a.antenne_id
    WHERE a.id = p_atelier
  ), FALSE);
$$;

-- Droits de la personne connectée (raccourci pour l'interface).
CREATE OR REPLACE FUNCTION public.mon_droit_atelier(p_atelier UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT public.atelier_inclus(auth.uid(), p_atelier);
$$;

REVOKE EXECUTE ON FUNCTION public.atelier_inclus(UUID, UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.atelier_inclus(UUID, UUID) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mon_droit_atelier(UUID)   FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.mon_droit_atelier(UUID)   TO authenticated;


-- Le déclencheur des inscriptions (définition de 20261015000000) : seul le calcul de
-- statut_paiement à l'INSERT change. « non_requis » si l'atelier est gratuit ou inclus
-- dans l'adhésion ; sinon « en_attente » (paiement à l'unité).
CREATE OR REPLACE FUNCTION private.proteger_inscriptions()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT private.est_client_non_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.utilisateur_id IS NOT NULL AND NEW.utilisateur_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Inscription non autorisée pour un autre compte.'
        USING ERRCODE = '42501';
    END IF;

    NEW.statut          := 'en_attente';
    NEW.statut_paiement := CASE WHEN public.atelier_inclus(NEW.utilisateur_id, NEW.atelier_id)
                                THEN 'non_requis' ELSE 'en_attente' END;
    NEW.present         := FALSE;
    NEW.annule_le       := NULL;
    NEW.inscrit_le      := now();
    RETURN NEW;
  END IF;

  -- UPDATE : seule transition permise = annulation.
  IF NEW.statut <> 'annule'
  OR NEW.id              IS DISTINCT FROM OLD.id
  OR NEW.utilisateur_id  IS DISTINCT FROM OLD.utilisateur_id
  OR NEW.atelier_id      IS DISTINCT FROM OLD.atelier_id
  OR NEW.statut_paiement IS DISTINCT FROM OLD.statut_paiement
  OR NEW.present         IS DISTINCT FROM OLD.present
  OR NEW.inscrit_le      IS DISTINCT FROM OLD.inscrit_le
  THEN
    RAISE EXCEPTION 'Modification non autorisée : vous pouvez seulement annuler votre inscription.'
      USING ERRCODE = '42501';
  END IF;

  NEW.annule_le := COALESCE(OLD.annule_le, now());
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.proteger_inscriptions() FROM PUBLIC;

-- ---------------------------------------------------------------------
-- 20261023000006_bloque_validation_impayee.sql
-- ---------------------------------------------------------------------
-- Blocage de la validation d'une pré-inscription non réglée.
--
-- (Le déclencheur s'appelle trg_verifier_… pour passer APRÈS trg_proteger_inscriptions, qui normalise d'abord les inscriptions des membres.)
--
-- Règle : une inscription ne peut passer (ou être créée) « confirmée » tant que son paiement est
-- « en_attente » (atelier à régler, ni payé ni non requis). Valable pour tout le monde, administrateurs
-- compris : la seule porte de sortie est la fonction valider_sans_paiement(), réservée aux
-- administrateurs, qui exige un motif et l'écrit dans le journal (logs / vue_logs).
--
-- Pour les inscriptions d'une personne qui a droit à l'atelier (gratuit ou inclus dans son adhésion),
-- le paiement est déjà « non_requis » (voir 20261023000005 et private.proteger_inscriptions) : aucun blocage.

CREATE OR REPLACE FUNCTION private.bloquer_validation_impayee()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NEW.statut = 'confirme'
     AND NEW.statut_paiement = 'en_attente'
     AND (TG_OP = 'INSERT' OR OLD.statut IS DISTINCT FROM 'confirme' OR OLD.statut_paiement IS DISTINCT FROM 'en_attente')
     AND COALESCE(current_setting('app.derogation_paiement', true), '') <> 'on'
  THEN
    RAISE EXCEPTION 'Paiement non réglé : enregistrez le règlement ou utilisez « Valider sans paiement ».'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.bloquer_validation_impayee() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_verifier_validation_impayee ON public.inscriptions;
CREATE TRIGGER trg_verifier_validation_impayee
  BEFORE INSERT OR UPDATE ON public.inscriptions
  FOR EACH ROW EXECUTE FUNCTION private.bloquer_validation_impayee();


-- Validation avec dérogation : administrateur uniquement, motif obligatoire, tracée dans le journal.
CREATE OR REPLACE FUNCTION public.valider_sans_paiement(p_inscription UUID, p_motif TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_ancien public.inscriptions%ROWTYPE;
BEGIN
  IF NOT private.utilisateur_est_admin() THEN
    RAISE EXCEPTION 'Action réservée aux administrateurs' USING ERRCODE = '42501';
  END IF;
  IF p_motif IS NULL OR length(btrim(p_motif)) < 3 THEN
    RAISE EXCEPTION 'Un motif est obligatoire' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_ancien FROM public.inscriptions WHERE id = p_inscription;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inscription introuvable' USING ERRCODE = 'P0002';
  END IF;

  PERFORM set_config('app.derogation_paiement', 'on', true);
  UPDATE public.inscriptions SET statut = 'confirme', annule_le = NULL WHERE id = p_inscription;
  PERFORM set_config('app.derogation_paiement', 'off', true);

  INSERT INTO public.logs (utilisateur_id, action, table_cible, enregistrement_cible_id, details)
  VALUES (auth.uid(), 'inscription.validate_sans_paiement', 'inscriptions', p_inscription,
          jsonb_build_object('motif', btrim(p_motif), 'statut_avant', v_ancien.statut::text,
                             'statut_paiement', v_ancien.statut_paiement::text));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.valider_sans_paiement(UUID, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.valider_sans_paiement(UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------
-- 20261023000007_tarif_adherente.sql
-- ---------------------------------------------------------------------
-- Deux tarifs par atelier : non-adhérente (tarif_standard, inchangé) et adhérente (tarif_adherent).
--
-- Une adhérente (au moins une adhésion active non échue) dont la formule ne couvre pas l'espace de
-- l'atelier paie le tarif adhérente s'il est renseigné ; sinon tout le monde paie tarif_standard.
-- Un atelier de l'espace couvert par sa formule reste « inclus ». Règle identique à src/lib/droits.ts.
-- Dépend de 20261023000005 (fonction atelier_inclus, remplacée ici).

ALTER TABLE public.ateliers
  ADD COLUMN IF NOT EXISTS tarif_adherent NUMERIC(8,2) CHECK (tarif_adherent IS NULL OR tarif_adherent >= 0);

COMMENT ON COLUMN public.ateliers.tarif_adherent IS
  'Prix pour une adhérente hors de son espace ; NULL = même prix que tarif_standard (prix non-adhérente).';

-- Atelier gratuit ou inclus pour cette personne (même signature qu'en 000005).
CREATE OR REPLACE FUNCTION public.atelier_inclus(p_utilisateur UUID, p_atelier UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  WITH visible AS (
    -- L'adhésion d'une autre personne n'est jamais révélée (sauf à un administrateur).
    SELECT p_utilisateur AS id
    WHERE p_utilisateur IS NOT NULL
      AND (p_utilisateur = auth.uid() OR private.utilisateur_est_admin())
  ),
  adhesions_en_cours AS (
    SELECT ad.formule_id
    FROM public.adhesions ad
    JOIN visible v ON v.id = ad.utilisateur_id
    WHERE ad.statut = 'active' AND ad.valable_jusqu_au >= current_date
  )
  SELECT COALESCE((
    SELECT
      COALESCE(
        CASE WHEN EXISTS (SELECT 1 FROM adhesions_en_cours) THEN a.tarif_adherent END,
        a.tarif_standard
      ) <= 0
      OR COALESCE(an.gratuit_pour_tous, FALSE)
      OR EXISTS (
        SELECT 1
        FROM adhesions_en_cours ae
        JOIN public.formule_espaces fe ON fe.formule_id = ae.formule_id
        WHERE fe.antenne_id = a.antenne_id
      )
    FROM public.ateliers a
    LEFT JOIN public.antennes an ON an.id = a.antenne_id
    WHERE a.id = p_atelier
  ), FALSE);
$$;

REVOKE EXECUTE ON FUNCTION public.atelier_inclus(UUID, UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.atelier_inclus(UUID, UUID) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 20261023000008_supprime_tables_de_sauvegarde.sql
-- ---------------------------------------------------------------------
-- Supprime deux tables de sauvegarde d'avril 2026 oubliées dans la base (relevées par la revue qualité du 23/10) :
--   inscriptions_backup_20260430          6 anciennes inscriptions de test (comptes de l'équipe), sans clé primaire ni politique RLS
--   transactions_paypal_backup_20260430   vide
-- Elles ne sont lues par aucun code (ni src/, ni fonction SQL) et contiennent des données personnelles inutiles.
-- IRRÉVERSIBLE pour les 6 lignes : le retour arrière du paquet ne les recrée pas. Ne lancer qu'avec l'accord de l'utilisatrice.
DROP TABLE IF EXISTS public.inscriptions_backup_20260430;
DROP TABLE IF EXISTS public.transactions_paypal_backup_20260430;

-- ---------------------------------------------------------------------
-- 20261023000009_reserve_admin_dispo_aux_admins.sql
-- ---------------------------------------------------------------------
-- La disponibilité des administratrices ne doit être lisible que par les administrateurs.
-- public.admin_dispo_le(date) n'est utilisée que par l'écran admin « Ateliers » mais restait appelable par
-- un visiteur via l'API (droit EXECUTE par défaut) : il pouvait savoir quels jours une administratrice est disponible.
-- Deux verrous : plus de droit d'exécution pour les visiteurs, et un contrôle administrateur dans la fonction.

CREATE OR REPLACE FUNCTION public.admin_dispo_le(p_date date)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_jour_semaine SMALLINT;
BEGIN
  IF NOT private.utilisateur_est_admin() THEN
    RAISE EXCEPTION 'Action réservée aux administrateurs' USING ERRCODE = '42501';
  END IF;
  v_jour_semaine := EXTRACT(DOW FROM p_date)::SMALLINT;
  RETURN EXISTS (
    SELECT 1 FROM utilisateurs u
    WHERE u.role = 'administrateur'
      AND EXISTS (SELECT 1 FROM disponibilites d WHERE d.utilisateur_id = u.id AND d.jour_semaine = v_jour_semaine)
      AND NOT EXISTS (SELECT 1 FROM indisponibilites i WHERE i.utilisateur_id = u.id AND p_date BETWEEN i.date_debut AND i.date_fin)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_dispo_le(date) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_dispo_le(date) TO authenticated;

-- ---------------------------------------------------------------------
-- 20261023000010_supprime_decrement_atelier_spots.sql
-- ---------------------------------------------------------------------
-- Supprime public.decrement_atelier_spots(), fonction morte relevée par la revue qualité du 23/10 :
-- aucun déclencheur, aucune politique ni fonction ne l'utilise (vérifié en production), et elle modifie
-- une colonne `spots` qui n'existe plus ; decrementer_places() l'a remplacée.
-- Pas de CASCADE : si un objet en dépendait encore, la suppression échouerait au lieu de le casser.
DROP FUNCTION IF EXISTS public.decrement_atelier_spots();

-- ---------------------------------------------------------------------
-- 20261024000000_nettoyage_premium_et_mot_de_passe_hash.sql
-- ---------------------------------------------------------------------
-- =====================================================
-- Nettoyage du schéma : restes de l'offre premium et colonne de mot de passe
-- =====================================================
-- 1. Retire 'membre_premium' de role_utilisateur et 'premium' de
--    acces_document. La migration 20260429000012 avait supprimé l'offre mais
--    laissé ces valeurs d'enum, faute de pouvoir recréer à la main la
--    quarantaine de policies qui en dépendent. Ici les policies sont
--    relevées dans le catalogue (pg_policy), supprimées, puis recréées à
--    l'identique après le changement de type : aucune liste codée en dur,
--    donc pas de dérive possible avec la base réelle.
--
-- 2. Supprime utilisateurs.mot_de_passe_hash : l'authentification passe par
--    Supabase Auth, la colonne n'est lue ni écrite par le site.
--
-- Les vues qui exposent ces colonnes (en prod : vue_suivi_inscriptions, qui
-- sélectionne utilisateurs.role) sont supprimées puis recréées avec la même
-- définition, les mêmes options (security_invoker) et les mêmes droits.
--
-- Tout est dans un seul bloc : en cas d'erreur (valeur encore utilisée,
-- vue ou règle dépendante non gérée, colonne non vide), RIEN n'est modifié
-- et le message dit pourquoi.
-- =====================================================

DO $$
DECLARE
  v_cible   RECORD;
  v_pol     RECORD;
  v_defauts JSONB := '{}';
  v_def     TEXT;
  v_oid_old OID;
  v_oid_tab OID;
  v_attnum  INT;
  v_policies JSONB := '[]';
  v_vues    JSONB := '[]';
  v_vue     RECORD;
  v_n       INT;
BEGIN
  -- Les types dans les définitions de policy doivent s'écrire sans schéma.
  PERFORM set_config('search_path', 'public, pg_catalog', true);

  -- ── Gardes : aucune ligne ne doit encore utiliser les valeurs retirées ──
  SELECT count(*) INTO v_n FROM public.utilisateurs WHERE role::text = 'membre_premium';
  IF v_n > 0 THEN
    RAISE EXCEPTION 'Abandon : % compte(s) ont encore le rôle membre_premium. Les passer à "membre" d''abord.', v_n;
  END IF;
  SELECT count(*) INTO v_n FROM public.documents WHERE acces::text = 'premium';
  IF v_n > 0 THEN
    RAISE EXCEPTION 'Abandon : % document(s) ont encore l''accès "premium". Les passer à "membres" d''abord.', v_n;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'utilisateurs' AND column_name = 'mot_de_passe_hash'
  ) THEN
    EXECUTE 'SELECT count(*) FROM public.utilisateurs WHERE mot_de_passe_hash IS NOT NULL' INTO v_n;
    IF v_n > 0 THEN
      RAISE EXCEPTION 'Abandon : % compte(s) ont une valeur dans mot_de_passe_hash. Vérifier avant de supprimer la colonne.', v_n;
    END IF;
  END IF;

  -- ── Relevé puis suppression des vues qui lisent role / acces ──
  FOR v_vue IN
    SELECT DISTINCT n.nspname AS schema_nom, c.relname AS vue_nom, c.oid AS vue_oid,
           pg_get_viewdef(c.oid) AS def, c.reloptions AS options,
           pg_get_userbyid(c.relowner) AS proprietaire,
           (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                     'grantee', CASE WHEN x.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
                     'priv', x.privilege_type)), '[]'::jsonb)
              FROM aclexplode(c.relacl) x) AS droits
    FROM pg_depend d
    JOIN pg_rewrite r ON d.classid = 'pg_rewrite'::regclass AND d.objid = r.oid
    JOIN pg_class c ON c.oid = r.ev_class AND c.relkind = 'v'
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = d.refobjid AND a.attnum = d.refobjsubid
    WHERE d.refclassid = 'pg_class'::regclass
      AND ((a.attrelid = 'public.utilisateurs'::regclass AND a.attname = 'role')
        OR (a.attrelid = 'public.documents'::regclass    AND a.attname = 'acces'))
  LOOP
    v_vues := v_vues || jsonb_build_object(
      'schema', v_vue.schema_nom, 'name', v_vue.vue_nom,
      'def', rtrim(v_vue.def, E'; \n'), 'opts', to_jsonb(v_vue.options),
      'owner', v_vue.proprietaire, 'acl', v_vue.droits);
    -- Sans CASCADE : une vue construite sur cette vue fait échouer (donc annule) la migration.
    EXECUTE format('DROP VIEW %I.%I', v_vue.schema_nom, v_vue.vue_nom);
  END LOOP;

  -- ── Relevé puis suppression des policies qui dépendent des deux types ──
  FOR v_cible IN
    SELECT * FROM (VALUES
      ('role_utilisateur', 'utilisateurs', 'role'),
      ('acces_document',   'documents',    'acces')
    ) AS t(type_nom, table_nom, colonne)
  LOOP
    SELECT oid INTO v_oid_old FROM pg_type
      WHERE typname = v_cible.type_nom AND typnamespace = 'public'::regnamespace;
    SELECT c.oid, a.attnum INTO v_oid_tab, v_attnum
      FROM pg_class c JOIN pg_attribute a ON a.attrelid = c.oid
      WHERE c.relnamespace = 'public'::regnamespace
        AND c.relname = v_cible.table_nom AND a.attname = v_cible.colonne;

    FOR v_pol IN
      SELECT DISTINCT pl.schemaname, pl.tablename, pl.policyname, pl.permissive,
             pl.roles, pl.cmd, pl.qual, pl.with_check
      FROM pg_depend d
      JOIN pg_policy p ON d.classid = 'pg_policy'::regclass AND d.objid = p.oid
      JOIN pg_class pc ON pc.oid = p.polrelid
      JOIN pg_namespace pn ON pn.oid = pc.relnamespace
      JOIN pg_policies pl ON pl.schemaname = pn.nspname
                         AND pl.tablename = pc.relname AND pl.policyname = p.polname
      WHERE (d.refclassid = 'pg_type'::regclass  AND d.refobjid = v_oid_old)
         OR (d.refclassid = 'pg_class'::regclass AND d.refobjid = v_oid_tab AND d.refobjsubid = v_attnum)
    LOOP
      v_policies := v_policies || jsonb_build_object(
        'schema', v_pol.schemaname, 'table', v_pol.tablename, 'name', v_pol.policyname,
        'permissive', v_pol.permissive, 'roles', to_jsonb(v_pol.roles), 'cmd', v_pol.cmd,
        'qual', v_pol.qual, 'check', v_pol.with_check);
      EXECUTE format('DROP POLICY %I ON %I.%I', v_pol.policyname, v_pol.schemaname, v_pol.tablename);
    END LOOP;
  END LOOP;

  -- ── Recréation des deux types sans les valeurs retirées ──
  FOR v_cible IN
    SELECT * FROM (VALUES
      ('role_utilisateur', 'utilisateurs', 'role',  ARRAY['administrateur','inscrit','membre']),
      ('acces_document',   'documents',    'acces', ARRAY['membres','tous'])
    ) AS t(type_nom, table_nom, colonne, valeurs)
  LOOP
    -- Les valeurs conservées doivent être exactement celles du type actuel,
    -- moins la valeur retirée : sinon une valeur ajoutée entre-temps serait perdue.
    IF (SELECT array_agg(e.enumlabel::text ORDER BY e.enumlabel)
        FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = v_cible.type_nom AND t.typnamespace = 'public'::regnamespace
          AND e.enumlabel NOT IN ('membre_premium', 'premium'))
       IS DISTINCT FROM (SELECT array_agg(x ORDER BY x) FROM unnest(v_cible.valeurs) x) THEN
      RAISE EXCEPTION 'Abandon : le type % contient des valeurs inattendues (mettre la migration à jour).', v_cible.type_nom;
    END IF;

    SELECT pg_get_expr(ad.adbin, ad.adrelid) INTO v_def
      FROM pg_attrdef ad JOIN pg_attribute a ON a.attrelid = ad.adrelid AND a.attnum = ad.adnum
      WHERE ad.adrelid = format('public.%I', v_cible.table_nom)::regclass AND a.attname = v_cible.colonne;
    IF v_def IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP DEFAULT', v_cible.table_nom, v_cible.colonne);
      v_defauts := v_defauts || jsonb_build_object(v_cible.type_nom, v_def);
    END IF;

    EXECUTE format('ALTER TYPE public.%I RENAME TO %I', v_cible.type_nom, v_cible.type_nom || '_ancien');
    EXECUTE format('CREATE TYPE public.%I AS ENUM (%s)', v_cible.type_nom,
                   (SELECT string_agg(quote_literal(v), ', ') FROM unnest(v_cible.valeurs) v));
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I TYPE public.%I USING %I::text::public.%I',
                   v_cible.table_nom, v_cible.colonne, v_cible.type_nom, v_cible.colonne, v_cible.type_nom);
    IF v_defauts ? v_cible.type_nom THEN
      -- Le type recréé porte le même nom : la valeur par défaut se réécrit telle quelle.
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I SET DEFAULT %s',
                     v_cible.table_nom, v_cible.colonne, v_defauts ->> v_cible.type_nom);
    END IF;
  END LOOP;

  -- ── Recréation des vues, à l'identique (définition, options, droits) ──
  FOR v_pol IN SELECT * FROM jsonb_array_elements(v_vues) AS j(p) LOOP
    EXECUTE format('CREATE VIEW %I.%I %s AS %s',
      v_pol.p ->> 'schema', v_pol.p ->> 'name',
      CASE WHEN jsonb_typeof(v_pol.p -> 'opts') = 'array'
           THEN 'WITH (' || (SELECT string_agg(o, ', ') FROM jsonb_array_elements_text(v_pol.p -> 'opts') o) || ')'
           ELSE '' END,
      v_pol.p ->> 'def');
    -- Une vue neuve reçoit les droits par défaut du schéma : on repart de zéro.
    FOR v_cible IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated', 'service_role') LOOP
      EXECUTE format('REVOKE ALL ON %I.%I FROM %I', v_pol.p ->> 'schema', v_pol.p ->> 'name', v_cible.rolname);
    END LOOP;
    FOR v_cible IN
      SELECT g ->> 'grantee' AS grantee, g ->> 'priv' AS priv
      FROM jsonb_array_elements(v_pol.p -> 'acl') g
      WHERE g ->> 'grantee' <> (v_pol.p ->> 'owner')
    LOOP
      EXECUTE format('GRANT %s ON %I.%I TO %s', v_cible.priv, v_pol.p ->> 'schema', v_pol.p ->> 'name',
                     CASE WHEN v_cible.grantee = 'PUBLIC' THEN 'PUBLIC' ELSE quote_ident(v_cible.grantee) END);
    END LOOP;
  END LOOP;

  -- ── Recréation des policies, à l'identique ──
  FOR v_pol IN SELECT * FROM jsonb_array_elements(v_policies) AS j(p) LOOP
    EXECUTE format(
      'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s',
      v_pol.p ->> 'name', v_pol.p ->> 'schema', v_pol.p ->> 'table',
      v_pol.p ->> 'permissive', v_pol.p ->> 'cmd',
      (SELECT string_agg(CASE WHEN r = 'public' THEN 'PUBLIC' ELSE quote_ident(r) END, ', ')
         FROM jsonb_array_elements_text(v_pol.p -> 'roles') r),
      CASE WHEN v_pol.p ->> 'qual'  IS NOT NULL THEN ' USING (' || (v_pol.p ->> 'qual') || ')' ELSE '' END,
      CASE WHEN v_pol.p ->> 'check' IS NOT NULL THEN ' WITH CHECK (' || (v_pol.p ->> 'check') || ')' ELSE '' END);
  END LOOP;

  -- Échoue (donc annule tout) si quoi que ce soit dépend encore des anciens types.
  DROP TYPE public.role_utilisateur_ancien;
  DROP TYPE public.acces_document_ancien;

  -- ── mot_de_passe_hash (sans CASCADE : échoue si une vue ou une règle l'utilise) ──
  ALTER TABLE public.utilisateurs DROP COLUMN IF EXISTS mot_de_passe_hash;

  RAISE NOTICE '% vue(s) et % policy(ies) recréée(s) après changement des enums.', jsonb_array_length(v_vues), jsonb_array_length(v_policies);
END
$$;

-- ---------------------------------------------------------------------
-- 20261024000001_conservation_des_donnees.sql
-- ---------------------------------------------------------------------
-- =====================================================
-- Durées de conservation des données personnelles (RGPD)
-- =====================================================
-- Jusqu'ici seule private.envois_publics était purgée (48 h). Cette migration
-- ajoute une purge planifiée pour le reste :
--
--   visites_site        supprimées après 13 mois
--   logs (journal admin) supprimés après 12 mois
--   contact_messages    supprimés après 3 ans
--   inscriptions d'invités (sans compte) anonymisées 3 ans après l'atelier :
--     nom, prénom, email, téléphone et date de naissance sont effacés, la ligne
--     reste pour les statistiques (présence, paiement, places).
--
-- Non concernés : les comptes membres (supprimés à la demande), et
-- transactions_paypal (conservées pour la comptabilité).
--
-- Les durées sont les constantes de la fonction ci-dessous : pour les changer,
-- republier la fonction, puis mettre à jour src/pages/Confidentialite.tsx.
--
-- La fonction n'est appelable ni par anon ni par authenticated : elle n'est
-- lancée que par pg_cron (rôle postgres) ou à la main depuis le SQL Editor.
-- Les triggers de protection laissent passer ces rôles (cf.
-- private.est_client_non_admin).
-- =====================================================

CREATE OR REPLACE FUNCTION private.purger_donnees_anciennes()
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  c_visites   CONSTANT INTERVAL := INTERVAL '13 months';
  c_journal   CONSTANT INTERVAL := INTERVAL '12 months';
  c_contacts  CONSTANT INTERVAL := INTERVAL '3 years';
  c_invites   CONSTANT INTERVAL := INTERVAL '3 years';
  n_visites   INT;
  n_journal   INT;
  n_contacts  INT;
  n_invites   INT;
BEGIN
  DELETE FROM public.visites_site WHERE cree_le < now() - c_visites;
  GET DIAGNOSTICS n_visites = ROW_COUNT;

  DELETE FROM public.logs WHERE horodatage < now() - c_journal;
  GET DIAGNOSTICS n_journal = ROW_COUNT;

  DELETE FROM public.contact_messages WHERE cree_le < now() - c_contacts;
  GET DIAGNOSTICS n_contacts = ROW_COUNT;

  -- La contrainte chk_participant impose un nom, un prénom et un email aux
  -- invités : on met des valeurs neutres. L'email reste unique par ligne pour
  -- ne pas déclencher la détection de doublons.
  UPDATE public.inscriptions i
  SET    nom_invite       = 'Anonymisé',
         prenom_invite    = 'Anonymisé',
         email_invite     = 'anonyme-' || i.id || '@anonyme.invalid',
         telephone_invite = NULL,
         date_naissance   = NULL
  FROM   public.ateliers a
  WHERE  a.id = i.atelier_id
    AND  i.utilisateur_id IS NULL
    AND  a.date_atelier < current_date - c_invites
    AND  i.email_invite NOT LIKE '%@anonyme.invalid';
  GET DIAGNOSTICS n_invites = ROW_COUNT;

  RETURN jsonb_build_object(
    'visites_supprimees',       n_visites,
    'journal_supprime',         n_journal,
    'messages_supprimes',       n_contacts,
    'invites_anonymises',       n_invites
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION private.purger_donnees_anciennes() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION private.purger_donnees_anciennes() IS
  'Purge RGPD : visites 13 mois, journal 12 mois, messages de contact 3 ans, invités anonymisés 3 ans après l''atelier. Renvoie le nombre de lignes traitées.';

-- Planification quotidienne (03:30 UTC) si pg_cron est disponible. On tente de
-- l'activer ; si ce n'est pas possible depuis la migration, activer
-- l'extension pg_cron dans Supabase (Database > Extensions) puis relancer ce bloc.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      CREATE EXTENSION IF NOT EXISTS pg_cron;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'pg_cron indisponible (%) : la purge n''est PAS planifiée.', SQLERRM;
    END;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'purger_donnees_anciennes_daily';
    PERFORM cron.schedule(
      'purger_donnees_anciennes_daily',
      '30 3 * * *',
      $cron$SELECT private.purger_donnees_anciennes();$cron$
    );

    -- Constaté en prod le 23/10/2026 : pg_cron n'était pas installé, donc le job
    -- de 20260411000000 (passage des ateliers passés à « terminé ») n'a jamais
    -- été planifié ; seule la page admin Ateliers le faisait à l'ouverture.
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'depublier_ateliers_passes_daily';
    PERFORM cron.schedule(
      'depublier_ateliers_passes_daily',
      '0 3 * * *',
      $cron$SELECT public.depublier_ateliers_passes();$cron$
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 20261025000000_pre_inscriptions_secours.sql
-- ---------------------------------------------------------------------
-- =====================================================
-- Filet de sécurité des pré-inscriptions : on ne perd jamais un contact
-- =====================================================
-- Le site enregistre une pré-inscription dans `inscriptions`. Si cet enregistrement échoue
-- (panne, limite d'envois atteinte, atelier retiré, erreur du navigateur…), il envoie les
-- coordonnées de la personne dans cette table, volontairement très permissive :
--   * aucune clé étrangère, aucune contrainte qui puisse refuser une ligne ;
--   * les champs trop longs sont tronqués au lieu d'être refusés ;
--   * seule une limite très large d'envois par adresse IP (60 par heure) protège la table.
-- Les administrateurs relisent ces demandes dans « Pré-inscriptions » et les traitent à la main.
-- Les demandes de plus de 6 mois sont supprimées (purge RGPD quotidienne).
-- Utilise private.utilisateur_est_admin() (et non private.is_admin(), absent en prod).

CREATE TABLE IF NOT EXISTS public.pre_inscriptions_secours (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cree_le        TIMESTAMPTZ NOT NULL DEFAULT now(),
  prenom         TEXT,
  nom            TEXT NOT NULL DEFAULT 'Sans nom',
  email          TEXT,
  telephone      TEXT,
  date_naissance TEXT,
  atelier_id     UUID,
  atelier_titre  TEXT,
  utilisateur_id UUID,
  droit_image    BOOLEAN,   -- NULL = pas de réponse
  accord_whatsapp BOOLEAN,  -- NULL = pas de réponse
  erreur         TEXT
);

CREATE INDEX IF NOT EXISTS idx_pre_inscriptions_secours_cree_le ON public.pre_inscriptions_secours (cree_le);

-- Tronque au lieu de refuser : la ligne est toujours acceptée.
CREATE OR REPLACE FUNCTION private.preparer_pre_inscription_secours()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.prenom         := NULLIF(left(btrim(COALESCE(NEW.prenom, '')), 200), '');
  NEW.nom            := COALESCE(NULLIF(left(btrim(COALESCE(NEW.nom, '')), 200), ''), 'Sans nom');
  NEW.email          := NULLIF(left(btrim(COALESCE(NEW.email, '')), 255), '');
  NEW.telephone      := NULLIF(left(btrim(COALESCE(NEW.telephone, '')), 40), '');
  NEW.date_naissance := NULLIF(left(btrim(COALESCE(NEW.date_naissance, '')), 20), '');
  NEW.atelier_titre  := NULLIF(left(btrim(COALESCE(NEW.atelier_titre, '')), 300), '');
  NEW.erreur         := NULLIF(left(btrim(COALESCE(NEW.erreur, '')), 500), '');

  -- Seuls les clients non administrateurs (visiteurs, membres) sont concernés par la limite.
  IF private.est_client_non_admin() THEN
    NEW.cree_le := now();
    PERFORM private.verifier_limite_envois('secours', 'ip:' || private.ip_client(), 60, INTERVAL '1 hour');
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.preparer_pre_inscription_secours() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_preparer_pre_inscription_secours ON public.pre_inscriptions_secours;
CREATE TRIGGER trg_preparer_pre_inscription_secours
  BEFORE INSERT ON public.pre_inscriptions_secours
  FOR EACH ROW EXECUTE FUNCTION private.preparer_pre_inscription_secours();

ALTER TABLE public.pre_inscriptions_secours ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut déposer une demande ; seuls les administrateurs la lisent et la suppriment.
DROP POLICY IF EXISTS pre_inscriptions_secours_depot ON public.pre_inscriptions_secours;
CREATE POLICY pre_inscriptions_secours_depot ON public.pre_inscriptions_secours
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS pre_inscriptions_secours_admin ON public.pre_inscriptions_secours;
CREATE POLICY pre_inscriptions_secours_admin ON public.pre_inscriptions_secours
  FOR ALL TO authenticated
  USING (private.utilisateur_est_admin()) WITH CHECK (private.utilisateur_est_admin());

REVOKE ALL ON public.pre_inscriptions_secours FROM PUBLIC, anon, authenticated;
GRANT INSERT ON public.pre_inscriptions_secours TO anon, authenticated;
GRANT SELECT, DELETE ON public.pre_inscriptions_secours TO authenticated;

-- Purge RGPD : même fonction que 20261024000002, plus les demandes de secours de plus de 6 mois.
CREATE OR REPLACE FUNCTION private.purger_donnees_anciennes()
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  c_visites    CONSTANT INTERVAL := INTERVAL '13 months';
  c_journal    CONSTANT INTERVAL := INTERVAL '12 months';
  c_contacts   CONSTANT INTERVAL := INTERVAL '3 years';
  c_invites    CONSTANT INTERVAL := INTERVAL '3 years';
  c_naissance  CONSTANT INTERVAL := INTERVAL '30 days';
  c_secours    CONSTANT INTERVAL := INTERVAL '6 months';
  n_visites    INT;
  n_journal    INT;
  n_contacts   INT;
  n_invites    INT;
  n_naissance  INT;
  n_secours    INT;
BEGIN
  DELETE FROM public.visites_site WHERE cree_le < now() - c_visites;
  GET DIAGNOSTICS n_visites = ROW_COUNT;

  DELETE FROM public.logs WHERE horodatage < now() - c_journal;
  GET DIAGNOSTICS n_journal = ROW_COUNT;

  DELETE FROM public.contact_messages WHERE cree_le < now() - c_contacts;
  GET DIAGNOSTICS n_contacts = ROW_COUNT;

  DELETE FROM public.pre_inscriptions_secours WHERE cree_le < now() - c_secours;
  GET DIAGNOSTICS n_secours = ROW_COUNT;

  -- Date de naissance : effacée peu après l'atelier (membres et invités).
  -- Doit passer avant l'anonymisation, qui l'efface aussi pour les anciens invités.
  UPDATE public.inscriptions i
  SET    date_naissance = NULL
  FROM   public.ateliers a
  WHERE  a.id = i.atelier_id
    AND  i.date_naissance IS NOT NULL
    AND  a.date_atelier < current_date - c_naissance;
  GET DIAGNOSTICS n_naissance = ROW_COUNT;

  UPDATE public.inscriptions i
  SET    nom_invite       = 'Anonymisé',
         prenom_invite    = 'Anonymisé',
         email_invite     = 'anonyme-' || i.id || '@anonyme.invalid',
         telephone_invite = NULL,
         date_naissance   = NULL
  FROM   public.ateliers a
  WHERE  a.id = i.atelier_id
    AND  i.utilisateur_id IS NULL
    AND  a.date_atelier < current_date - c_invites
    AND  i.email_invite NOT LIKE '%@anonyme.invalid';
  GET DIAGNOSTICS n_invites = ROW_COUNT;

  RETURN jsonb_build_object(
    'visites_supprimees',       n_visites,
    'journal_supprime',         n_journal,
    'messages_supprimes',       n_contacts,
    'demandes_secours_supprimees', n_secours,
    'dates_naissance_effacees', n_naissance,
    'invites_anonymises',       n_invites
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION private.purger_donnees_anciennes() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION private.purger_donnees_anciennes() IS
  'Purge RGPD : visites 13 mois, journal 12 mois, messages de contact 3 ans, demandes de secours 6 mois, dates de naissance 30 jours après l''atelier, invités anonymisés 3 ans après l''atelier. Renvoie le nombre de lignes traitées.';

-- ---------------------------------------------------------------------
-- 20261025000001_consentements_pre_inscription.sql
-- ---------------------------------------------------------------------
-- =====================================================
-- Pré-inscription : droit à l'image et groupe WhatsApp
-- =====================================================
-- Le formulaire de pré-inscription demande désormais deux réponses explicites (J'autorise / Je n'autorise pas,
-- J'accepte / Je n'accepte pas) :
--   * autorisation_image : photos et vidéos prises pendant l'atelier ;
--   * accord_whatsapp    : ajout au groupe WhatsApp du club.
-- NULL = pas de réponse (pré-inscriptions faites avant cette date, ou saisies par l'équipe).
-- La date du consentement est posée par la base (jamais par le navigateur) pour servir de preuve.
-- Le nom et le prénom étaient déjà deux colonnes distinctes (nom_invite, prenom_invite) : rien à changer.
-- Ce droit à l'image est propre à l'atelier : il ne remplace pas l'autorisation du bulletin d'adhésion
-- (table adhesions, vue vue_autorisation_image).

ALTER TABLE public.inscriptions
  ADD COLUMN IF NOT EXISTS autorisation_image BOOLEAN,
  ADD COLUMN IF NOT EXISTS accord_whatsapp    BOOLEAN,
  ADD COLUMN IF NOT EXISTS consentements_le   TIMESTAMPTZ;

COMMENT ON COLUMN public.inscriptions.autorisation_image IS
  'Droit à l''image donné à la pré-inscription : true = autorise, false = n''autorise pas, NULL = pas de réponse.';
COMMENT ON COLUMN public.inscriptions.accord_whatsapp IS
  'Accord pour l''ajout au groupe WhatsApp du club : true = accepte, false = n''accepte pas, NULL = pas de réponse.';

CREATE OR REPLACE FUNCTION private.dater_consentements_inscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF private.est_client_non_admin() THEN
    NEW.consentements_le := CASE
      WHEN NEW.autorisation_image IS NOT NULL OR NEW.accord_whatsapp IS NOT NULL THEN now()
      ELSE NULL
    END;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.dater_consentements_inscription() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_dater_consentements_inscription ON public.inscriptions;
CREATE TRIGGER trg_dater_consentements_inscription
  BEFORE INSERT ON public.inscriptions
  FOR EACH ROW EXECUTE FUNCTION private.dater_consentements_inscription();

-- ---------------------------------------------------------------------
-- 20261026000000_membre_exige_adhesion.sql
-- ---------------------------------------------------------------------
-- Règle : il ne peut pas y avoir de membre sans adhésion (sauf les administrateurs).
--
-- Un compte ne peut recevoir le rôle `membre`, à la création comme en modification, que s'il a une
-- adhésion en cours : statut `active` et `valable_jusqu_au` non dépassée. Valable pour tout le monde,
-- administrateurs compris : la seule porte d'entrée est valider_adhesion() (20261023000003), qui active
-- l'adhésion AVANT de changer le rôle, dans la même transaction.
--
-- Ce qui n'est PAS touché :
--   - les comptes déjà `membre` sans adhésion (aucune réécriture) : le contrôle ne porte que sur un
--     changement vers `membre`, pas sur les enregistrements qui laissent le rôle tel quel ;
--   - les administrateurs, qui n'ont pas besoin d'adhésion ;
--   - le retour à `inscrit` (échéance, expirer_adhesions()).

CREATE OR REPLACE FUNCTION private.exiger_adhesion_pour_membre()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NEW.role = 'membre'
     AND (TG_OP = 'INSERT' OR OLD.role IS DISTINCT FROM 'membre')
     AND NOT EXISTS (
       SELECT 1 FROM public.adhesions a
        WHERE a.utilisateur_id = NEW.id
          AND a.statut = 'active'
          AND a.valable_jusqu_au >= CURRENT_DATE
     )
  THEN
    RAISE EXCEPTION 'Le rôle Membre exige une adhésion en cours : saisissez puis validez son adhésion (Offre & adhésions).'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.exiger_adhesion_pour_membre() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_utilisateurs_membre_exige_adhesion ON public.utilisateurs;
CREATE TRIGGER trg_utilisateurs_membre_exige_adhesion
  BEFORE INSERT OR UPDATE OF role ON public.utilisateurs
  FOR EACH ROW EXECUTE FUNCTION private.exiger_adhesion_pour_membre();

COMMIT;
