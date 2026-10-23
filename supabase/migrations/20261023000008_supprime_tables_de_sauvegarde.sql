-- Supprime deux tables de sauvegarde d'avril 2026 oubliées dans la base (relevées par la revue qualité du 23/10) :
--   inscriptions_backup_20260430          6 anciennes inscriptions de test (comptes de l'équipe), sans clé primaire ni politique RLS
--   transactions_paypal_backup_20260430   vide
-- Elles ne sont lues par aucun code (ni src/, ni fonction SQL) et contiennent des données personnelles inutiles.
-- IRRÉVERSIBLE pour les 6 lignes : le retour arrière du paquet ne les recrée pas. Ne lancer qu'avec l'accord de l'utilisatrice.
DROP TABLE IF EXISTS public.inscriptions_backup_20260430;
DROP TABLE IF EXISTS public.transactions_paypal_backup_20260430;
