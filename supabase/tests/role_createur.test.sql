\set ON_ERROR_STOP 0
\set VERBOSITY terse
\echo '== 1. Après la migration : seule christellelab@gmail.com est créatrice (doit afficher 1 ligne, true)'
SELECT email, est_createur FROM utilisateurs WHERE est_createur;
\echo '== 2. La créatrice retire son propre statut (doit échouer)'
BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);
UPDATE utilisateurs SET est_createur=false WHERE id='11111111-1111-1111-1111-111111111111'; ROLLBACK;
\echo '== 3. Un membre se déclare créateur (doit échouer)'
BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333',true);
UPDATE utilisateurs SET est_createur=true WHERE id='33333333-3333-3333-3333-333333333333'; ROLLBACK;
\echo '== 4. Une autre administratrice se déclare créatrice (doit échouer)'
BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',true);
UPDATE utilisateurs SET est_createur=true WHERE id='22222222-2222-2222-2222-222222222222'; ROLLBACK;
\echo '== 5. Une administratrice rétrograde la créatrice (doit échouer)'
BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',true);
UPDATE utilisateurs SET role='membre' WHERE id='11111111-1111-1111-1111-111111111111'; ROLLBACK;
\echo '== 6. Une administratrice désactive la créatrice (doit échouer)'
BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',true);
UPDATE utilisateurs SET est_actif=false WHERE id='11111111-1111-1111-1111-111111111111'; ROLLBACK;
\echo '== 7. Une administratrice supprime la créatrice (doit échouer)'
BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',true);
DELETE FROM utilisateurs WHERE id='11111111-1111-1111-1111-111111111111'; ROLLBACK;
\echo '== 8. La créatrice change son prénom (doit réussir)'
BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);
UPDATE utilisateurs SET prenom='Chris' WHERE id='11111111-1111-1111-1111-111111111111'; ROLLBACK;
\echo '== 9. La créatrice change son email (doit échouer)'
BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);
UPDATE utilisateurs SET email='autre@x.fr' WHERE id='11111111-1111-1111-1111-111111111111'; ROLLBACK;
\echo '== 10. Création d un compte avec est_createur = true depuis le site (doit échouer)'
BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',true);
INSERT INTO utilisateurs (id,email,role,est_createur) VALUES ('44444444-4444-4444-4444-444444444444','christellelab2@gmail.com','administrateur',true); ROLLBACK;
\echo '== 11. Une administratrice change le rôle d un membre (doit réussir : rien ne change pour les autres)'
BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',true);
UPDATE utilisateurs SET role='membre_premium' WHERE id='33333333-3333-3333-3333-333333333333'; ROLLBACK;
\echo '== 12. SQL editor : désigner un autre email comme créateur (doit échouer : contrainte CHECK)'
BEGIN; UPDATE utilisateurs SET est_createur=true WHERE id='22222222-2222-2222-2222-222222222222'; ROLLBACK;
\echo '== 13. SQL editor : rétrograder la créatrice (doit échouer : elle doit rester administratrice)'
BEGIN; UPDATE utilisateurs SET role='membre' WHERE id='11111111-1111-1111-1111-111111111111'; ROLLBACK;
\echo '== 14. SQL editor : retirer puis rétablir le statut de créatrice (doit réussir)'
BEGIN; UPDATE utilisateurs SET est_createur=false WHERE id='11111111-1111-1111-1111-111111111111'; UPDATE utilisateurs SET est_createur=true WHERE id='11111111-1111-1111-1111-111111111111'; ROLLBACK;
