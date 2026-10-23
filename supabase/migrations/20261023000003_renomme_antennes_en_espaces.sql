-- =====================================================
-- Renommage « antennes » -> « espaces »
-- =====================================================
-- Le site et l'admin parlent d'« espaces » (Papotages, Créatifs, Business)
-- depuis le commit « antennes devient espaces » ; la base disait encore
-- « antennes » (migration 20260429000017). Cette migration aligne la base :
--
--   table antennes            -> espaces
--   ateliers.antenne_id       -> espace_id (et sa clé étrangère)
--   policies antennes_*       -> espaces_*
--   index et contraintes      -> noms alignés
--   vues : colonnes antenne / antenne_slug -> espace / espace_slug
--
-- Seule la page admin « Ateliers » lit ces noms : à déployer avec le site
-- (versions du code postérieures au commit qui accompagne cette migration).
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
END
$$;
