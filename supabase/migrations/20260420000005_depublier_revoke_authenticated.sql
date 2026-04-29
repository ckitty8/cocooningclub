-- =====================================================
-- depublier_ateliers_passes : retirer EXECUTE à 'authenticated'
-- =====================================================
-- L'advisor remonte que la fonction SECURITY DEFINER reste exposée via
-- /rest/v1/rpc/depublier_ateliers_passes aux utilisateurs connectés.
-- Le check admin interne empêche l'usage abusif mais l'advisor ne le
-- voit pas. On retire complètement EXECUTE pour authenticated/anon.
--
-- La fonction reste appelable par :
--   - le cron pg_cron (rôle postgres / supabase_admin)
--   - tout job exécuté en dehors de PostgREST
-- Le frontend (admin/Ateliers.tsx) ne l'appelle plus depuis cette migration.
-- =====================================================

REVOKE EXECUTE ON FUNCTION public.depublier_ateliers_passes() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.depublier_ateliers_passes() FROM anon;
REVOKE EXECUTE ON FUNCTION public.depublier_ateliers_passes() FROM authenticated;
