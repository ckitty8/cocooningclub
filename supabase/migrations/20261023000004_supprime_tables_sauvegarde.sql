-- =====================================================
-- Suppression des deux tables de sauvegarde du 30/04/2026
-- =====================================================
-- Copies ponctuelles faites avant le rattrapage des inscriptions
-- (20260429000008) : inscriptions_backup_20260430 (6 inscriptions de membres,
-- avril 2026) et transactions_paypal_backup_20260430 (vide).
--
-- Vérifié en prod le 23/10/2026 : aucune vue, clé étrangère ni ligne de code
-- n'y fait référence ; RLS activé sans policy mais droits complets accordés à
-- anon et authenticated. Ce sont des doublons de données personnelles sans
-- usage : on les supprime. Pas de CASCADE : toute dépendance inattendue fait
-- échouer la migration.
-- =====================================================

DROP TABLE IF EXISTS public.inscriptions_backup_20260430;
DROP TABLE IF EXISTS public.transactions_paypal_backup_20260430;
