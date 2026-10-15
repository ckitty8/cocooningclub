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
\echo '== 6. X-Forwarded-For falsifié : ignoré, la limite par IP ne compte pas cette valeur (12 envois passent, emails différents)'
BEGIN; SET LOCAL ROLE anon; SELECT set_config('request.headers','{"x-forwarded-for":"9.9.9.9"}',true) \g /dev/null
DO $$ BEGIN FOR i IN 1..12 LOOP
  INSERT INTO inscriptions (atelier_id, prenom_invite, nom_invite, email_invite) VALUES ('aaaaaaaa-0000-0000-0000-000000000001','A','B','xff'||i||'@test.fr');
END LOOP; END $$;
RESET ROLE; SELECT count(*) AS cles_ip_enregistrees FROM private.envois_publics WHERE cle LIKE 'ip:%'; ROLLBACK;
\echo '== 7. Visiteur qui reprend l email d une membre déjà inscrite (doit échouer : doublon)'
BEGIN; SET LOCAL ROLE anon;
INSERT INTO inscriptions (atelier_id, prenom_invite, nom_invite, email_invite) VALUES ('aaaaaaaa-0000-0000-0000-000000000001','M','D','MEMBRE@x.fr'); ROLLBACK;
\echo '== 8. Non-admin qui crée un compte avec un rôle (doit échouer explicitement)'
BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','44444444-4444-4444-4444-444444444444',true) \g /dev/null
INSERT INTO utilisateurs (id, email, prenom, nom, role) VALUES ('44444444-4444-4444-4444-444444444444','n@x.fr','N','X','membre'); ROLLBACK;
\echo '== 9. Plafond global : 101e pré-inscription de l heure refusée'
BEGIN; SET LOCAL ROLE anon;
DO $$ BEGIN FOR i IN 1..100 LOOP
  INSERT INTO inscriptions (atelier_id, prenom_invite, nom_invite, email_invite) VALUES ('aaaaaaaa-0000-0000-0000-000000000001','A','B','g'||i||'@test.fr');
END LOOP; END $$;
INSERT INTO inscriptions (atelier_id, prenom_invite, nom_invite, email_invite) VALUES ('aaaaaaaa-0000-0000-0000-000000000001','A','B','g101@test.fr'); ROLLBACK;
