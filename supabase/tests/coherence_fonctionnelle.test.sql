\set ON_ERROR_STOP 0
\set VERBOSITY terse
\echo '== 1. Un admin écrit une action libre dans le journal (doit réussir)'
BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',true) \g /dev/null
INSERT INTO logs (utilisateur_id, action) VALUES ('22222222-2222-2222-2222-222222222222', 'atelier.create'); ROLLBACK;
\echo '== 2. Un membre annule son inscription confirmée (doit réussir et rendre la place)'
BEGIN; SELECT places_disponibles AS places_avant FROM ateliers WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001';
SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true) \g /dev/null
UPDATE inscriptions SET statut = 'annule' WHERE id = 'bbbbbbbb-0000-0000-0000-000000000001';
RESET ROLE; SELECT places_disponibles AS places_apres FROM ateliers WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001'; ROLLBACK;
\echo '== 3. Un membre ne peut toujours pas annuler l inscription d une autre (0 ligne)'
BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true) \g /dev/null
UPDATE inscriptions SET statut = 'annule' WHERE id = 'bbbbbbbb-0000-0000-0000-000000000003'; ROLLBACK;
\echo '== 4. Un visiteur lit les témoignages avec prénom + initiale et atelier'
BEGIN; SET LOCAL ROLE anon; SELECT note, commentaire, auteur, atelier_titre FROM temoignages_publics(); ROLLBACK;
\echo '== 5. Un visiteur ne peut pas lire le journal (doit échouer)'
BEGIN; SET LOCAL ROLE anon; SELECT count(*) FROM vue_logs; ROLLBACK;
