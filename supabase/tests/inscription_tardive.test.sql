\set ON_ERROR_STOP 0
\set VERBOSITY terse
\echo '== AVANT correctif : un visiteur s inscrit à un atelier ouvert (doit échouer : private.is_admin() n existe pas)'
BEGIN; SET LOCAL ROLE anon;
INSERT INTO inscriptions (atelier_id, email_invite) VALUES ('aaaaaaaa-0000-0000-0000-000000000001','v@x.fr'); ROLLBACK;
\echo '== Application du correctif'
\i supabase/migrations/20261023000001_corrige_inscription_tardive.sql
\echo '== 1. Visiteur, atelier ouvert (doit réussir)'
BEGIN; SET LOCAL ROLE anon;
INSERT INTO inscriptions (atelier_id, email_invite) VALUES ('aaaaaaaa-0000-0000-0000-000000000001','v@x.fr'); ROLLBACK;
\echo '== 2. Membre connecté, atelier ouvert (doit réussir)'
BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);
INSERT INTO inscriptions (atelier_id, utilisateur_id) VALUES ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111'); ROLLBACK;
\echo '== 3. Atelier sans date de fin (doit réussir)'
BEGIN; SET LOCAL ROLE anon;
INSERT INTO inscriptions (atelier_id, email_invite) VALUES ('aaaaaaaa-0000-0000-0000-000000000003','v@x.fr'); ROLLBACK;
\echo '== 4. Visiteur, atelier dont les inscriptions sont closes (doit échouer : closes)'
BEGIN; SET LOCAL ROLE anon;
INSERT INTO inscriptions (atelier_id, email_invite) VALUES ('aaaaaaaa-0000-0000-0000-000000000002','v@x.fr'); ROLLBACK;
\echo '== 5. Membre connecté, inscriptions closes (doit échouer : closes)'
BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);
INSERT INTO inscriptions (atelier_id, utilisateur_id) VALUES ('aaaaaaaa-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111'); ROLLBACK;
\echo '== 6. Administratrice, inscriptions closes (doit réussir)'
BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',true);
INSERT INTO inscriptions (atelier_id, utilisateur_id) VALUES ('aaaaaaaa-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111'); ROLLBACK;
\echo '== 7. Rejouer le correctif (doit réussir sans erreur)'
\i supabase/migrations/20261023000001_corrige_inscription_tardive.sql
