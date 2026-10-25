-- Renommage antennes -> espaces APRÈS les migrations de l'offre (20261023000003 à 000009).
-- À lancer depuis la racine du dépôt, sur la base du scénario « droits par offre » après
-- droits_par_offre.setup.sql et les migrations 000005, 000006, 000007, 000009, puis
-- 20261024000003_renomme_antennes_en_espaces.sql (voir README.md).
\set ON_ERROR_STOP 0
\set VERBOSITY terse
\echo '== 1. formule_espaces et ateliers pointent vers espace_id, plus aucun antenne_id (attendu : 2 colonnes, 0 reste)'
SELECT (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'espace_id' AND table_name IN ('ateliers', 'formule_espaces')) AS colonnes_espace_id,
       (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND column_name ~ 'antenne') AS restes_antenne;

\echo '== 2. La fonction atelier_inclus ne cite plus l ancien nom et répond (attendu : f, puis papotages et offert = t)'
SELECT pg_get_functiondef('public.atelier_inclus(uuid,uuid)'::regprocedure) ~ 'antenne' AS cite_antenne;
SELECT a.titre, public.atelier_inclus(NULL, a.id) AS inclus_pour_une_visiteuse
FROM ateliers a WHERE a.titre IN ('Café des copines', 'Atelier offert', 'Pitch en public') ORDER BY a.titre;

\echo '== 3. Une visiteuse peut encore se pré-inscrire (le déclencheur appelle atelier_inclus) : attendu INSERT 0 1'
INSERT INTO inscriptions (atelier_id, utilisateur_id)
SELECT id, NULL FROM ateliers WHERE titre = 'Atelier offert';

\echo '== 4. Droits conservés : anon peut appeler atelier_inclus, PUBLIC non (attendu : t, f)'
SELECT has_function_privilege('anon', 'public.atelier_inclus(uuid,uuid)', 'EXECUTE') AS anon,
       has_function_privilege('public', 'public.atelier_inclus(uuid,uuid)', 'EXECUTE') AS public;
