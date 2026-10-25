-- =====================================================================
-- MIGRATIONS À APPLIQUER AU DÉPLOIEMENT DU SITE : à coller dans le SQL Editor de Supabase.
-- Fichier généré par `npm run migration:build` : ne pas le modifier à la main.
-- Tout est exécuté dans une seule transaction : en cas d'erreur, rien n'est appliqué.
-- Contient : 20261024000002_minimisation_date_naissance.sql, 20261024000003_renomme_antennes_en_espaces.sql
-- À lancer juste après le déploiement du site (l'ancien code n'y survit pas), puis verifications-deploiement.sql.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 20261024000002_minimisation_date_naissance.sql
-- ---------------------------------------------------------------------
-- =====================================================
-- Minimisation de la date de naissance
-- =====================================================
-- La date de naissance n'est utile que pour un atelier (thème astrologique) et
-- est saisie sur la pré-inscription. La copie stockée sur le compte
-- (utilisateurs.date_naissance) n'était lue par aucune fonctionnalité :
--
--   1. supprime utilisateurs.date_naissance (sans CASCADE : échoue si une vue
--      ou une règle l'utilise encore) ;
--   2. la purge RGPD efface désormais inscriptions.date_naissance 30 jours
--      après la date de l'atelier, pour les membres comme pour les invités.
--
-- Remplace private.purger_donnees_anciennes() de 20261024000001 par une
-- version identique + l'étape 2.
-- =====================================================

ALTER TABLE public.utilisateurs DROP COLUMN IF EXISTS date_naissance;

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
  n_visites    INT;
  n_journal    INT;
  n_contacts   INT;
  n_invites    INT;
  n_naissance  INT;
BEGIN
  DELETE FROM public.visites_site WHERE cree_le < now() - c_visites;
  GET DIAGNOSTICS n_visites = ROW_COUNT;

  DELETE FROM public.logs WHERE horodatage < now() - c_journal;
  GET DIAGNOSTICS n_journal = ROW_COUNT;

  DELETE FROM public.contact_messages WHERE cree_le < now() - c_contacts;
  GET DIAGNOSTICS n_contacts = ROW_COUNT;

  -- Date de naissance : effacée peu après l'atelier (membres et invités).
  -- Doit passer avant l'anonymisation, qui l'efface aussi pour les anciens invités.
  UPDATE public.inscriptions i
  SET    date_naissance = NULL
  FROM   public.ateliers a
  WHERE  a.id = i.atelier_id
    AND  i.date_naissance IS NOT NULL
    AND  a.date_atelier < current_date - c_naissance;
  GET DIAGNOSTICS n_naissance = ROW_COUNT;

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
    'dates_naissance_effacees', n_naissance,
    'invites_anonymises',       n_invites
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION private.purger_donnees_anciennes() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION private.purger_donnees_anciennes() IS
  'Purge RGPD : visites 13 mois, journal 12 mois, messages de contact 3 ans, dates de naissance 30 jours après l''atelier, invités anonymisés 3 ans après l''atelier. Renvoie le nombre de lignes traitées.';

-- ---------------------------------------------------------------------
-- 20261024000003_renomme_antennes_en_espaces.sql
-- ---------------------------------------------------------------------
-- =====================================================
-- Renommage « antennes » -> « espaces »
-- =====================================================
-- Le site et l'admin parlent d'« espaces » (Papotages, Créatifs, Business)
-- depuis le commit « antennes devient espaces » ; la base disait encore
-- « antennes » (migration 20260429000017). Cette migration aligne la base :
--
--   table antennes            -> espaces
--   ateliers.antenne_id       -> espace_id (et sa clé étrangère)
--   formule_espaces.antenne_id -> espace_id (et sa clé étrangère)
--   fonction atelier_inclus   -> recréée avec les nouveaux noms (corps SQL en texte)
--   policies antennes_*       -> espaces_*
--   index et contraintes      -> noms alignés
--   vues : colonnes antenne / antenne_slug -> espace / espace_slug
--
-- Le site lit ces noms (ateliers, offre, droits) : à déployer avec le site
-- (versions du code postérieures au commit qui accompagne cette migration).
-- À appliquer après les migrations 20261023* (formules, droits par offre).
-- Les types Realtime, les droits (GRANT) et les données suivent le renommage.
-- Chaque étape est gardée : rejouer la migration ne casse rien.
-- =====================================================

DO $$
BEGIN
  IF to_regclass('public.antennes') IS NOT NULL THEN
    ALTER TABLE public.antennes RENAME TO espaces;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'ateliers' AND column_name = 'antenne_id') THEN
    ALTER TABLE public.ateliers RENAME COLUMN antenne_id TO espace_id;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ateliers_antenne_id_fkey') THEN
    ALTER TABLE public.ateliers RENAME CONSTRAINT ateliers_antenne_id_fkey TO ateliers_espace_id_fkey;
  END IF;

  -- Clés primaire / uniques créées sous l'ancien nom « categories ».
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_pkey' AND conrelid = 'public.espaces'::regclass) THEN
    ALTER TABLE public.espaces RENAME CONSTRAINT categories_pkey TO espaces_pkey;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_nom_key' AND conrelid = 'public.espaces'::regclass) THEN
    ALTER TABLE public.espaces RENAME CONSTRAINT categories_nom_key TO espaces_nom_key;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_slug_key' AND conrelid = 'public.espaces'::regclass) THEN
    ALTER TABLE public.espaces RENAME CONSTRAINT categories_slug_key TO espaces_slug_key;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'espaces' AND policyname = 'antennes_admin') THEN
    ALTER POLICY "antennes_admin" ON public.espaces RENAME TO "espaces_admin";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'espaces' AND policyname = 'antennes_lecture') THEN
    ALTER POLICY "antennes_lecture" ON public.espaces RENAME TO "espaces_lecture";
  END IF;

  IF to_regclass('public.idx_categories_ordre') IS NOT NULL THEN
    ALTER INDEX public.idx_categories_ordre RENAME TO idx_espaces_ordre;
  END IF;
  IF to_regclass('public.idx_ateliers_categorie') IS NOT NULL THEN
    ALTER INDEX public.idx_ateliers_categorie RENAME TO idx_ateliers_espace;
  END IF;

  -- Colonnes exposées par les vues.
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'vue_prochains_ateliers' AND column_name = 'antenne') THEN
    ALTER VIEW public.vue_prochains_ateliers RENAME COLUMN antenne TO espace;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'vue_prochains_ateliers' AND column_name = 'antenne_slug') THEN
    ALTER VIEW public.vue_prochains_ateliers RENAME COLUMN antenne_slug TO espace_slug;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'vue_avis_publies' AND column_name = 'antenne') THEN
    ALTER VIEW public.vue_avis_publies RENAME COLUMN antenne TO espace;
  END IF;

  -- Tables de l'offre (20261023000003) : colonne et clé étrangère vers l'espace.
  IF to_regclass('public.formule_espaces') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'formule_espaces' AND column_name = 'antenne_id') THEN
      ALTER TABLE public.formule_espaces RENAME COLUMN antenne_id TO espace_id;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint
               WHERE conname = 'formule_espaces_antenne_id_fkey' AND conrelid = 'public.formule_espaces'::regclass) THEN
      ALTER TABLE public.formule_espaces RENAME CONSTRAINT formule_espaces_antenne_id_fkey TO formule_espaces_espace_id_fkey;
    END IF;
  END IF;
END
$$;

-- Le corps d'une fonction SQL est du texte relu à chaque appel : atelier_inclus
-- (20261023000005 / 000007) doit être réécrite avec les nouveaux noms, sinon les
-- pré-inscriptions échouent (colonne « antenne_id » introuvable).
DO $$
BEGIN
  IF to_regprocedure('public.atelier_inclus(uuid,uuid)') IS NOT NULL THEN
    EXECUTE $def$
      CREATE OR REPLACE FUNCTION public.atelier_inclus(p_utilisateur UUID, p_atelier UUID)
      RETURNS BOOLEAN
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public, pg_catalog
      AS $body$
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
            OR COALESCE(es.gratuit_pour_tous, FALSE)
            OR EXISTS (
              SELECT 1
              FROM adhesions_en_cours ae
              JOIN public.formule_espaces fe ON fe.formule_id = ae.formule_id
              WHERE fe.espace_id = a.espace_id
            )
          FROM public.ateliers a
          LEFT JOIN public.espaces es ON es.id = a.espace_id
          WHERE a.id = p_atelier
        ), FALSE);
      $body$
    $def$;
    REVOKE EXECUTE ON FUNCTION public.atelier_inclus(UUID, UUID) FROM PUBLIC;
    GRANT  EXECUTE ON FUNCTION public.atelier_inclus(UUID, UUID) TO anon, authenticated;
  END IF;
END
$$;

COMMIT;
