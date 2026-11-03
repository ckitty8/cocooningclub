-- Scénarios de 20261103000000_nos_offres.sql (tout est annulé à la fin). Base « o » du bloc « Offre et adhésions »
-- (setup + 20261023000003), puis 20261024000003 (espaces) et la migration.
\set ON_ERROR_STOP off
\set ON_ERROR_ROLLBACK on
\echo '--- 1. Les formules portent les noms de l''affiche, dans l''ordre Chill, Business, Chill + Business (attendu : 3 lignes, 180 sur la dernière)'
SELECT nom, prix, ordre, rythme, prix_barre, mise_en_avant, jsonb_array_length(activites) AS activites, cardinality(compris) AS compris FROM formules ORDER BY ordre;

BEGIN;
\echo '--- 2. Contraintes : activites doit être une liste, prix barré positif (attendu : 2 erreurs check)'
UPDATE formules SET activites = '{"nom": "x"}'::jsonb WHERE ordre = 1;
UPDATE formules SET prix_barre = -1 WHERE ordre = 1;
ROLLBACK;

BEGIN;
\echo '--- 3. L''admin ajoute une question publiée et un brouillon (attendu : INSERT 0 2)'
SELECT set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
SET LOCAL ROLE authenticated;
INSERT INTO bon_a_savoir (question, reponse, est_publiee, ordre) VALUES ('Publiée ?', 'Oui', TRUE, 1), ('Brouillon ?', '', FALSE, 2);
RESET ROLE;
\echo '--- 4. Un visiteur ne voit que la question publiée et ne peut rien modifier (attendu : 1, puis erreur 42501 ou UPDATE 0)'
SET LOCAL ROLE anon;
SELECT count(*) AS visibles FROM bon_a_savoir;
UPDATE bon_a_savoir SET question = 'piratée';
INSERT INTO bon_a_savoir (question) VALUES ('spam');
RESET ROLE;
\echo '--- 5. Une inscrite non plus (attendu : 1, UPDATE 0, puis erreur RLS à l''INSERT)'
SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
SET LOCAL ROLE authenticated;
SELECT count(*) AS visibles FROM bon_a_savoir;
UPDATE bon_a_savoir SET question = 'piratée';
INSERT INTO bon_a_savoir (question) VALUES ('spam');
RESET ROLE;
\echo '--- 6. Question vide refusée (attendu : erreur check)'
INSERT INTO bon_a_savoir (question) VALUES ('   ');
ROLLBACK;
