-- À lancer depuis la racine du dépôt, sur la base « t » du README (les trois setup de sécurité et les migrations
-- 20261015000000, 20261015000001 et 20261016000000), après 20261117000001_affichage_public_ateliers.sql.
\set ON_ERROR_STOP 0
\set VERBOSITY terse
\echo '== 1. Une visiteuse lit le réglage (attendu : 1 ligne, NULL, NULL)'
BEGIN; SET LOCAL ROLE anon; SELECT count(*) AS lignes, max(accueil::text) AS accueil, max(calendrier::text) AS calendrier FROM parametres_affichage_ateliers; ROLLBACK;
\echo '== 2. Une visiteuse ne modifie pas le réglage (doit échouer)'
BEGIN; SET LOCAL ROLE anon; UPDATE parametres_affichage_ateliers SET accueil = '{lieu}'; ROLLBACK;
\echo '== 3. Une membre ne modifie rien ; une administratrice oui (attendu : UPDATE 0 puis {lieu,tarif})'
BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true) \g /dev/null
UPDATE parametres_affichage_ateliers SET accueil = '{lieu}';
SELECT set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',true) \g /dev/null
UPDATE parametres_affichage_ateliers SET accueil = '{lieu,tarif}' RETURNING accueil; ROLLBACK;
\echo '== 4. Pas de deuxième ligne (doit échouer)'
BEGIN; INSERT INTO parametres_affichage_ateliers (id) VALUES (false); ROLLBACK;
