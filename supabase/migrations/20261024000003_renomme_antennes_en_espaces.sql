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
