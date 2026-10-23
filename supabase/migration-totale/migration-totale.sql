-- =====================================================================
-- MIGRATION TOTALE DU SITE : à coller dans le SQL Editor de Supabase.
-- Fichier généré par `npm run migration:build` : ne pas le modifier à la main.
-- Tout est exécuté dans une seule transaction : en cas d'erreur, rien n'est appliqué.
-- Contient : 20261023000002_supprime_membre_et_compte.sql, 20261023000003_offre_et_adhesions.sql, 20261023000004_retire_role_membre_premium.sql, 20261023000005_droits_par_offre.sql, 20261023000006_bloque_validation_impayee.sql, 20261023000007_tarif_adherente.sql, 20261023000008_supprime_tables_de_sauvegarde.sql, 20261023000009_reserve_admin_dispo_aux_admins.sql
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

COMMIT;
