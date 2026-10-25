-- RETOUR ARRIÈRE de migration-deploiement.sql (à n'utiliser qu'en cas de problème), à lancer AVANT retour-arriere.sql.
-- Revenir aussi au code précédent : il lit « antennes », « antenne_id » et utilisateurs.date_naissance.
-- ATTENTION : les dates de naissance des comptes ont été supprimées par 20261024000002 : la colonne est recréée VIDE.
-- La purge RGPD (private.purger_donnees_anciennes) garde la version de 20261024000002 : elle ne touche pas aux colonnes renommées.
BEGIN;
ALTER TABLE public.utilisateurs ADD COLUMN IF NOT EXISTS date_naissance DATE;

DO $$
BEGIN
  IF to_regclass('public.espaces') IS NOT NULL THEN
    ALTER TABLE public.espaces RENAME TO antennes;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ateliers' AND column_name = 'espace_id') THEN
    ALTER TABLE public.ateliers RENAME COLUMN espace_id TO antenne_id;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ateliers_espace_id_fkey') THEN
    ALTER TABLE public.ateliers RENAME CONSTRAINT ateliers_espace_id_fkey TO ateliers_antenne_id_fkey;
  END IF;
  IF to_regclass('public.formule_espaces') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'formule_espaces' AND column_name = 'espace_id') THEN
      ALTER TABLE public.formule_espaces RENAME COLUMN espace_id TO antenne_id;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'formule_espaces_espace_id_fkey') THEN
      ALTER TABLE public.formule_espaces RENAME CONSTRAINT formule_espaces_espace_id_fkey TO formule_espaces_antenne_id_fkey;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'antennes' AND policyname = 'espaces_admin') THEN
    ALTER POLICY "espaces_admin" ON public.antennes RENAME TO "antennes_admin";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'antennes' AND policyname = 'espaces_lecture') THEN
    ALTER POLICY "espaces_lecture" ON public.antennes RENAME TO "antennes_lecture";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vue_prochains_ateliers' AND column_name = 'espace') THEN
    ALTER VIEW public.vue_prochains_ateliers RENAME COLUMN espace TO antenne;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vue_prochains_ateliers' AND column_name = 'espace_slug') THEN
    ALTER VIEW public.vue_prochains_ateliers RENAME COLUMN espace_slug TO antenne_slug;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vue_avis_publies' AND column_name = 'espace') THEN
    ALTER VIEW public.vue_avis_publies RENAME COLUMN espace TO antenne;
  END IF;
END
$$;

-- atelier_inclus (corps SQL en texte) : retour aux anciens noms de colonne et de table.
CREATE OR REPLACE FUNCTION public.atelier_inclus(p_utilisateur UUID, p_atelier UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  WITH visible AS (
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
COMMIT;
