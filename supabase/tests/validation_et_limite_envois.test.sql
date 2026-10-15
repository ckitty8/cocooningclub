\set ON_ERROR_STOP 0
\set VERBOSITY terse
-- Simule les en-têtes HTTP transmis par l'API (IP du visiteur).
\echo '== 1. Pré-inscription valide (doit réussir)'
BEGIN; SET LOCAL ROLE anon; SELECT set_config('request.headers','{"x-forwarded-for":"1.1.1.1"}',true) \g /dev/null
INSERT INTO inscriptions (atelier_id, prenom_invite, nom_invite, email_invite, telephone_invite) VALUES ('aaaaaaaa-0000-0000-0000-000000000001','Léa','Martin','lea@exemple.fr','06 12 34 56 78'); ROLLBACK;
\echo '== 2. Email invalide (doit échouer)'
BEGIN; SET LOCAL ROLE anon;
INSERT INTO inscriptions (atelier_id, prenom_invite, nom_invite, email_invite) VALUES ('aaaaaaaa-0000-0000-0000-000000000001','Léa','Martin','pas-un-email'); ROLLBACK;
\echo '== 3. Téléphone invalide (doit échouer)'
BEGIN; SET LOCAL ROLE anon;
INSERT INTO inscriptions (atelier_id, prenom_invite, nom_invite, email_invite, telephone_invite) VALUES ('aaaaaaaa-0000-0000-0000-000000000001','Léa','Martin','lea@exemple.fr','appelle-moi'); ROLLBACK;
\echo '== 4. Doublon sur le même atelier, email en majuscules (doit échouer)'
BEGIN; SET LOCAL ROLE anon;
INSERT INTO inscriptions (atelier_id, prenom_invite, nom_invite, email_invite) VALUES ('aaaaaaaa-0000-0000-0000-000000000002','Léa','Martin','lea@exemple.fr');
INSERT INTO inscriptions (atelier_id, prenom_invite, nom_invite, email_invite) VALUES ('aaaaaaaa-0000-0000-0000-000000000002','Léa','Martin','LEA@exemple.fr'); ROLLBACK;
\echo '== 5. Même IP, 11 pré-inscriptions en 1 h (la 11e doit échouer)'
BEGIN; SET LOCAL ROLE anon; SELECT set_config('request.headers','{"x-forwarded-for":"6.6.6.6, 10.0.0.1"}',true) \g /dev/null
DO $$ BEGIN FOR i IN 1..10 LOOP
  INSERT INTO inscriptions (atelier_id, prenom_invite, nom_invite, email_invite) VALUES ('aaaaaaaa-0000-0000-0000-000000000001','Bot','Bot','bot'||i||'@spam.fr');
END LOOP; END $$;
INSERT INTO inscriptions (atelier_id, prenom_invite, nom_invite, email_invite) VALUES ('aaaaaaaa-0000-0000-0000-000000000002','Bot','Bot','bot11@spam.fr'); ROLLBACK;
\echo '== 6. Membre connecté déjà inscrit à l atelier (doit échouer)'
BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true) \g /dev/null
INSERT INTO inscriptions (atelier_id, utilisateur_id) VALUES ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111'); ROLLBACK;
\echo '== 7. Admin : pas de limite ni de doublon bloquant (doit réussir)'
BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',true) \g /dev/null
INSERT INTO inscriptions (atelier_id, utilisateur_id) VALUES ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111'); ROLLBACK;
\echo '== 8. Message de contact valide (doit réussir)'
BEGIN; SET LOCAL ROLE anon; SELECT set_config('request.headers','{"cf-connecting-ip":"2.2.2.2"}',true) \g /dev/null
INSERT INTO contact_messages (email, reponses) VALUES ('lea@exemple.fr','{"Nom":"Léa","Message":"Bonjour !"}'); ROLLBACK;
\echo '== 9. Message de contact trop long (doit échouer)'
BEGIN; SET LOCAL ROLE anon;
INSERT INTO contact_messages (email, reponses) VALUES ('lea@exemple.fr', jsonb_build_object('Message', repeat('x', 2001))); ROLLBACK;
\echo '== 10. 4 messages du même email en 1 h (le 4e doit échouer)'
BEGIN; SET LOCAL ROLE anon;
INSERT INTO contact_messages (email, reponses) VALUES ('a@b.fr','{"m":"1"}');
INSERT INTO contact_messages (email, reponses) VALUES ('a@b.fr','{"m":"2"}');
INSERT INTO contact_messages (email, reponses) VALUES ('a@b.fr','{"m":"3"}');
INSERT INTO contact_messages (email, reponses) VALUES ('a@b.fr','{"m":"4"}'); ROLLBACK;
\echo '== 11. Visiteur anonyme ne peut pas lire le journal des envois (doit échouer)'
BEGIN; SET LOCAL ROLE anon; SELECT count(*) FROM private.envois_publics; ROLLBACK;
