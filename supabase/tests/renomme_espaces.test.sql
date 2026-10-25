-- Après renomme_espaces.setup.sql et la migration 20261024000003 (rejouée ici une 2e fois).
\set ON_ERROR_STOP 0
\set VERBOSITY terse
\echo '== 1. Plus aucun objet « antenne » ni « categorie » (attendu : 0 ligne)'
SELECT 'table' AS type, c.relname AS nom FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace AND (c.relname ~ 'antenne|categorie')
UNION ALL SELECT 'colonne', table_name || '.' || column_name FROM information_schema.columns WHERE table_schema = 'public' AND column_name ~ 'antenne|categorie'
UNION ALL SELECT 'contrainte', conname FROM pg_constraint WHERE connamespace = 'public'::regnamespace AND conname ~ 'antenne|categorie'
UNION ALL SELECT 'policy', policyname FROM pg_policies WHERE policyname ~ 'antenne|categorie';

\echo '== 2. Nouveaux noms en place'
SELECT (SELECT count(*) FROM pg_policies WHERE tablename = 'espaces' AND policyname IN ('espaces_lecture','espaces_admin')) AS policies,
       (SELECT count(*) FROM pg_constraint WHERE conname IN ('ateliers_espace_id_fkey','espaces_pkey','espaces_nom_key','espaces_slug_key')) AS contraintes,
       (SELECT count(*) FROM pg_indexes WHERE indexname IN ('idx_espaces_ordre','idx_ateliers_espace')) AS index;

\echo '== 3. Les données et les vues suivent (attendu : 1 atelier relié à Papotages)'
SELECT espace, espace_slug FROM vue_prochains_ateliers;
SELECT count(*) AS ateliers_par_espace FROM ateliers a JOIN espaces e ON e.id = a.espace_id;

\echo '== 4. Un visiteur lit toujours les espaces (attendu : 1)'
BEGIN; SET LOCAL ROLE anon; SELECT count(*) FROM espaces; ROLLBACK;

\echo '== 5. L ancien nom n existe plus (doit échouer)'
SELECT * FROM antennes;
