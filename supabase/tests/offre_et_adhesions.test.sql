-- Scénarios de 20261023000003_offre_et_adhesions.sql (tout est annulé à la fin).
\set ON_ERROR_STOP off
\echo '--- 1. Les 3 formules du bulletin sont créées (100 / 80 / 150 €), avec leurs espaces'
SELECT f.nom, f.prix, f.duree_mois, (SELECT string_agg(a.slug, '+' ORDER BY a.slug) FROM formule_espaces fe JOIN antennes a ON a.id = fe.antenne_id WHERE fe.formule_id = f.id) espaces FROM formules f ORDER BY ordre;

BEGIN;
\echo '--- 2. Un visiteur voit les formules actives mais ne peut pas les modifier (attendu : 3 lignes puis UPDATE 0 ou refus)'
SET LOCAL ROLE anon;
SELECT count(*) AS visibles FROM formules;
UPDATE formules SET prix = 1;
RESET ROLE;
ROLLBACK;

BEGIN;
\echo '--- 3. Une inscrite ne voit pas les adhésions des autres, ne peut pas valider (attendu : 0 ligne, puis erreur 42501)'
INSERT INTO adhesions (utilisateur_id, formule_id) SELECT '44444444-4444-4444-4444-444444444444', id FROM formules WHERE nom = 'Cocooning Créatif';
SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
SET LOCAL ROLE authenticated;
SELECT count(*) AS vues FROM adhesions;
SELECT valider_adhesion((SELECT id FROM adhesions LIMIT 1), 'virement');
RESET ROLE;
ROLLBACK;

BEGIN;
\echo '--- 4. L''admin crée puis valide : montant fixé par la formule, dates, passage inscrit -> membre (attendu : montant 80, 2026-10-23 -> 2027-10-23, role membre)'
SELECT set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
SET LOCAL ROLE authenticated;
INSERT INTO adhesions (utilisateur_id, formule_id, montant, mode_reglement)
  SELECT '11111111-1111-1111-1111-111111111111', id, 0.01, 'virement' FROM formules WHERE nom = 'Cocooning Créatif';
SELECT numero, statut, montant FROM adhesions;
SELECT statut, mode_reglement, cotisation_recue_le, date_validation, valable_jusqu_au FROM valider_adhesion((SELECT id FROM adhesions LIMIT 1), 'especes', DATE '2026-10-22', DATE '2026-10-23');
SELECT role, debut_abonnement, fin_abonnement FROM utilisateurs WHERE id = '11111111-1111-1111-1111-111111111111';
\echo '--- 4b. Valider une 2e fois est refusé (attendu : erreur 22023)'
SELECT valider_adhesion((SELECT id FROM adhesions LIMIT 1), 'especes');
RESET ROLE;
ROLLBACK;

BEGIN;
\echo '--- 5. Fin de mois : 31/01 + 1 mois = 28/02 (attendu : 2027-02-28)'
SELECT set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
UPDATE formules SET duree_mois = 1 WHERE nom = 'Cocooning Business';
SET LOCAL ROLE authenticated;
INSERT INTO adhesions (utilisateur_id, formule_id) SELECT '44444444-4444-4444-4444-444444444444', id FROM formules WHERE nom = 'Cocooning Business';
SELECT valider_adhesion((SELECT id FROM adhesions LIMIT 1), 'virement', NULL, DATE '2027-01-31');
RESET ROLE;
SELECT valable_jusqu_au FROM adhesions;
ROLLBACK;

BEGIN;
\echo '--- 6. Échéance : l''adhérente échue repasse inscrit ; l''ancien membre sans adhésion et celle encore valable restent membres (attendu : 1 puis inscrit / membre / membre)'
INSERT INTO adhesions (utilisateur_id, formule_id, statut, date_validation, valable_jusqu_au)
  SELECT '11111111-1111-1111-1111-111111111111', id, 'active', current_date - 400, current_date - 35 FROM formules WHERE nom = 'Cocooning Créatif';
UPDATE utilisateurs SET role = 'membre' WHERE id = '11111111-1111-1111-1111-111111111111';
INSERT INTO adhesions (utilisateur_id, formule_id, statut, date_validation, valable_jusqu_au)
  SELECT '44444444-4444-4444-4444-444444444444', id, 'active', current_date - 10, current_date + 355 FROM formules WHERE nom = 'Cocooning Créatif';
UPDATE utilisateurs SET role = 'membre' WHERE id = '44444444-4444-4444-4444-444444444444';
SELECT set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
SET LOCAL ROLE authenticated;
SELECT expirer_adhesions() AS repassees_inscrit;
RESET ROLE;
SELECT email, role FROM utilisateurs WHERE id IN ('11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','44444444-4444-4444-4444-444444444444') ORDER BY email;
ROLLBACK;

BEGIN;
\echo '--- 7. Une formule utilisée ne peut pas être supprimée (attendu : erreur 23503)'
INSERT INTO adhesions (utilisateur_id, formule_id) SELECT '44444444-4444-4444-4444-444444444444', id FROM formules WHERE nom = 'Cocooning Créatif';
DELETE FROM formules WHERE nom = 'Cocooning Créatif';
ROLLBACK;
