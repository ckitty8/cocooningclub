-- =====================================================
-- Dépublication automatique des ateliers passés
-- =====================================================
-- Objectif : tout atelier dont la date est < aujourd'hui
-- et dont le statut est 'publie' ou 'complet' passe à 'termine'.
-- =====================================================

-- 1. Fonction SQL
CREATE OR REPLACE FUNCTION depublier_ateliers_passes()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  nb_maj INTEGER;
BEGIN
  UPDATE ateliers
  SET statut = 'termine'
  WHERE date_atelier < CURRENT_DATE
    AND statut IN ('publie', 'complet');

  GET DIAGNOSTICS nb_maj = ROW_COUNT;
  RETURN nb_maj;
END;
$$;

COMMENT ON FUNCTION depublier_ateliers_passes() IS
  'Dépublie automatiquement tous les ateliers dont la date est passée. Retourne le nombre d''ateliers mis à jour.';

-- 2. Autoriser son exécution par les admins (via RPC)
GRANT EXECUTE ON FUNCTION depublier_ateliers_passes() TO authenticated;
GRANT EXECUTE ON FUNCTION depublier_ateliers_passes() TO anon;

-- 3. Exécution immédiate pour nettoyer les ateliers déjà passés
SELECT depublier_ateliers_passes();

-- 4. Planification quotidienne via pg_cron (si l'extension est disponible)
-- Tourne tous les jours à 03:00 (heure du serveur Supabase, UTC).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Supprimer un job existant portant le même nom (idempotent)
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'depublier_ateliers_passes_daily';

    -- Créer le job
    PERFORM cron.schedule(
      'depublier_ateliers_passes_daily',
      '0 3 * * *',
      $cron$SELECT public.depublier_ateliers_passes();$cron$
    );
  END IF;
END $$;
