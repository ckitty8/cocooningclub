-- Scénarios de 20261026000000_membre_exige_adhesion.sql (tout est annulé à la fin).
-- À lancer sur la base « o » (voir README) APRÈS offre_et_adhesions.test.sql et la migration.
-- Utilisatrices : 1111 inscrite, 2222 administratrice, 3333 « ancien membre » sans adhésion (déjà membre avant la règle), 4444 inscrite.
\set ON_ERROR_STOP off

BEGIN;
\echo '--- 1. Passer inscrite -> membre sans adhésion est refusé (attendu : erreur 23514, rôle inchangé)'
UPDATE utilisateurs SET role = 'membre' WHERE id = '44444444-4444-4444-4444-444444444444';
ROLLBACK;

BEGIN;
\echo '--- 2. Créer un compte directement membre est refusé (attendu : erreur 23514)'
INSERT INTO utilisateurs (id, email, role) VALUES ('55555555-5555-5555-5555-555555555555', 'neuve@x.fr', 'membre');
ROLLBACK;

BEGIN;
\echo '--- 3. Une adhésion en attente ne suffit pas (attendu : erreur 23514)'
INSERT INTO adhesions (utilisateur_id, formule_id, statut) SELECT '44444444-4444-4444-4444-444444444444', id, 'en_attente' FROM formules WHERE nom = 'Cocooning Créatif';
UPDATE utilisateurs SET role = 'membre' WHERE id = '44444444-4444-4444-4444-444444444444';
ROLLBACK;

BEGIN;
\echo '--- 3b. Une adhésion refusée non plus (attendu : erreur 23514)'
INSERT INTO adhesions (utilisateur_id, formule_id, statut) SELECT '44444444-4444-4444-4444-444444444444', id, 'refusee' FROM formules WHERE nom = 'Cocooning Créatif';
UPDATE utilisateurs SET role = 'membre' WHERE id = '44444444-4444-4444-4444-444444444444';
ROLLBACK;

BEGIN;
\echo '--- 4. Une adhésion active mais échue ne suffit pas (attendu : erreur 23514)'
INSERT INTO adhesions (utilisateur_id, formule_id, statut, date_validation, valable_jusqu_au)
  SELECT '44444444-4444-4444-4444-444444444444', id, 'active', current_date - 400, current_date - 35 FROM formules WHERE nom = 'Cocooning Créatif';
UPDATE utilisateurs SET role = 'membre' WHERE id = '44444444-4444-4444-4444-444444444444';
ROLLBACK;

BEGIN;
\echo '--- 5. Une adhésion active et valable autorise le rôle membre (attendu : UPDATE 1)'
INSERT INTO adhesions (utilisateur_id, formule_id, statut, date_validation, valable_jusqu_au)
  SELECT '44444444-4444-4444-4444-444444444444', id, 'active', current_date - 10, current_date + 355 FROM formules WHERE nom = 'Cocooning Créatif';
UPDATE utilisateurs SET role = 'membre' WHERE id = '44444444-4444-4444-4444-444444444444';
ROLLBACK;

BEGIN;
\echo '--- 6. Le parcours normal fonctionne : l''admin crée puis valide, la personne devient membre (attendu : role membre)'
SELECT set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
SET LOCAL ROLE authenticated;
INSERT INTO adhesions (utilisateur_id, formule_id) SELECT '44444444-4444-4444-4444-444444444444', id FROM formules WHERE nom = 'Cocooning Business';
SELECT statut FROM valider_adhesion((SELECT id FROM adhesions LIMIT 1), 'virement');
RESET ROLE;
SELECT role FROM utilisateurs WHERE id = '44444444-4444-4444-4444-444444444444';
ROLLBACK;

BEGIN;
\echo '--- 7. L''admin ne peut pas non plus attribuer le rôle à la main (attendu : erreur 23514)'
SELECT set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
SET LOCAL ROLE authenticated;
UPDATE utilisateurs SET role = 'membre' WHERE id = '11111111-1111-1111-1111-111111111111';
RESET ROLE;
ROLLBACK;

BEGIN;
\echo '--- 8. Un ancien membre sans adhésion reste modifiable tant que son rôle ne change pas (attendu : UPDATE 1 deux fois, rôle membre)'
UPDATE utilisateurs SET email = 'ancien2@x.fr' WHERE id = '33333333-3333-3333-3333-333333333333';
UPDATE utilisateurs SET role = 'membre' WHERE id = '33333333-3333-3333-3333-333333333333';
SELECT role FROM utilisateurs WHERE id = '33333333-3333-3333-3333-333333333333';
ROLLBACK;

BEGIN;
\echo '--- 9. Retour à inscrit possible, mais pas de retour à membre sans adhésion (attendu : UPDATE 1 puis erreur 23514)'
UPDATE utilisateurs SET role = 'inscrit' WHERE id = '33333333-3333-3333-3333-333333333333';
UPDATE utilisateurs SET role = 'membre' WHERE id = '33333333-3333-3333-3333-333333333333';
ROLLBACK;

BEGIN;
\echo '--- 10. Les administrateurs n''ont pas besoin d''adhésion (attendu : UPDATE 1, role administrateur)'
UPDATE utilisateurs SET role = 'administrateur' WHERE id = '11111111-1111-1111-1111-111111111111';
SELECT role FROM utilisateurs WHERE id = '11111111-1111-1111-1111-111111111111';
INSERT INTO utilisateurs (id, email, role) VALUES ('66666666-6666-6666-6666-666666666666', 'admin2@x.fr', 'administrateur');
ROLLBACK;

BEGIN;
\echo '--- 11. L''échéance continue de fonctionner (attendu : 1 compte repassé inscrit)'
INSERT INTO adhesions (utilisateur_id, formule_id, statut, date_validation, valable_jusqu_au)
  SELECT '44444444-4444-4444-4444-444444444444', id, 'active', current_date - 400, current_date + 1 FROM formules WHERE nom = 'Cocooning Créatif';
UPDATE utilisateurs SET role = 'membre' WHERE id = '44444444-4444-4444-4444-444444444444';
UPDATE adhesions SET valable_jusqu_au = current_date - 1;
SELECT set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
SET LOCAL ROLE authenticated;
SELECT expirer_adhesions() AS repassees_inscrit;
RESET ROLE;
SELECT role FROM utilisateurs WHERE id = '44444444-4444-4444-4444-444444444444';
ROLLBACK;
