-- Scénarios de 20261023000005_droits_par_offre.sql (tout est annulé à la fin).
\set ON_ERROR_STOP off
\echo '--- 1. Papotages est marqué gratuit pour tous, pas les autres (attendu : papotages = t, les autres f)'
SELECT slug, gratuit_pour_tous FROM antennes ORDER BY slug;

BEGIN;
\echo '--- 2. Sans adhésion (attendu : gratuit = Café + Atelier offert ; payant = floral, pitch, tarif inconnu)'
SELECT a.titre, atelier_inclus('11111111-1111-1111-1111-111111111111', a.id) AS inclus FROM ateliers a ORDER BY a.titre;
ROLLBACK;

BEGIN;
\echo '--- 3. Adhérente Créatif (attendu : inclus = Café, floral, offert, tarif inconnu ; pitch = f)'
INSERT INTO adhesions (utilisateur_id, formule_id, statut, date_validation, valable_jusqu_au) SELECT '11111111-1111-1111-1111-111111111111', id, 'active', current_date, current_date + 30 FROM formules WHERE nom = 'Cocooning Créatif';
SELECT a.titre, atelier_inclus('11111111-1111-1111-1111-111111111111', a.id) AS inclus FROM ateliers a ORDER BY a.titre;
ROLLBACK;

BEGIN;
\echo '--- 4. Adhérente Business (attendu : pitch = t ; floral = f)'
INSERT INTO adhesions (utilisateur_id, formule_id, statut, date_validation, valable_jusqu_au) SELECT '11111111-1111-1111-1111-111111111111', id, 'active', current_date, current_date + 30 FROM formules WHERE nom = 'Cocooning Business';
SELECT a.titre, atelier_inclus('11111111-1111-1111-1111-111111111111', a.id) AS inclus FROM ateliers a WHERE a.titre IN ('Pitch en public','Atelier floral') ORDER BY a.titre;
ROLLBACK;

BEGIN;
\echo '--- 5. Adhérente Complet (attendu : tout t)'
INSERT INTO adhesions (utilisateur_id, formule_id, statut, date_validation, valable_jusqu_au) SELECT '11111111-1111-1111-1111-111111111111', id, 'active', current_date, current_date + 30 FROM formules WHERE nom = 'Cocooning Complet';
SELECT bool_and(atelier_inclus('11111111-1111-1111-1111-111111111111', a.id)) AS tout_inclus FROM ateliers a;
ROLLBACK;

BEGIN;
\echo '--- 6. Adhésion échue ou en attente : plus rien d''inclus (attendu : floral = f dans les deux cas)'
INSERT INTO adhesions (utilisateur_id, formule_id, statut, date_validation, valable_jusqu_au) SELECT '11111111-1111-1111-1111-111111111111', id, 'active', current_date, current_date - 1 FROM formules WHERE nom = 'Cocooning Créatif';
INSERT INTO adhesions (utilisateur_id, formule_id, statut) SELECT '44444444-4444-4444-4444-444444444444', id, 'en_attente' FROM formules WHERE nom = 'Cocooning Créatif';
SELECT atelier_inclus('11111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222') AS echue,
       atelier_inclus('44444444-4444-4444-4444-444444444444', 'a2222222-2222-2222-2222-222222222222') AS en_attente;
ROLLBACK;

BEGIN;
\echo '--- 7. Invité sans compte : seulement le gratuit (attendu : Café = t, floral = f)'
SELECT atelier_inclus(NULL, 'a1111111-1111-1111-1111-111111111111') AS cafe, atelier_inclus(NULL, 'a2222222-2222-2222-2222-222222222222') AS floral;
ROLLBACK;

BEGIN;
\echo '--- 8. Déclencheur : une adhérente Créatif s''inscrit au floral et au pitch (attendu : floral non_requis, pitch en_attente, statut en_attente)'
INSERT INTO adhesions (utilisateur_id, formule_id, statut, date_validation, valable_jusqu_au) SELECT '11111111-1111-1111-1111-111111111111', id, 'active', current_date, current_date + 30 FROM formules WHERE nom = 'Cocooning Créatif';
SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
SET LOCAL ROLE authenticated;
INSERT INTO inscriptions (atelier_id, utilisateur_id, statut, statut_paiement) VALUES
  ('a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'confirme', 'paye'),
  ('a3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'confirme', 'non_requis');
SELECT a.titre, i.statut, i.statut_paiement FROM inscriptions i JOIN ateliers a ON a.id = i.atelier_id ORDER BY a.titre;
RESET ROLE;
ROLLBACK;

BEGIN;
\echo '--- 9. Déclencheur : s''inscrire pour une autre personne est refusé (attendu : erreur 42501)'
SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
SET LOCAL ROLE authenticated;
INSERT INTO inscriptions (atelier_id, utilisateur_id) VALUES ('a1111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444');
RESET ROLE;
ROLLBACK;

BEGIN;
\echo '--- 10. On ne voit pas l''adhésion d''une autre personne (attendu : moi = t, l''autre = f ; admin voit les deux = t, t)'
INSERT INTO adhesions (utilisateur_id, formule_id, statut, date_validation, valable_jusqu_au) SELECT u, id, 'active', current_date, current_date + 30 FROM formules, (VALUES ('11111111-1111-1111-1111-111111111111'::uuid), ('44444444-4444-4444-4444-444444444444'::uuid)) v(u) WHERE nom = 'Cocooning Créatif';
SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
SET LOCAL ROLE authenticated;
SELECT atelier_inclus('11111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222') AS moi,
       atelier_inclus('44444444-4444-4444-4444-444444444444', 'a2222222-2222-2222-2222-222222222222') AS autre,
       mon_droit_atelier('a2222222-2222-2222-2222-222222222222') AS mon_droit;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
SET LOCAL ROLE authenticated;
SELECT atelier_inclus('11111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222') AS admin_voit_1,
       atelier_inclus('44444444-4444-4444-4444-444444444444', 'a2222222-2222-2222-2222-222222222222') AS admin_voit_2;
RESET ROLE;
ROLLBACK;

BEGIN;
\echo '--- 11. Un visiteur sans compte peut s''inscrire à un atelier gratuit (attendu : en_attente / non_requis) mais pas à un payant (en_attente / en_attente)'
GRANT INSERT ON inscriptions TO anon;
SET LOCAL ROLE anon;
INSERT INTO inscriptions (atelier_id) VALUES ('a1111111-1111-1111-1111-111111111111'), ('a2222222-2222-2222-2222-222222222222');
RESET ROLE;
SELECT a.titre, i.statut, i.statut_paiement FROM inscriptions i JOIN ateliers a ON a.id = i.atelier_id ORDER BY a.titre;
ROLLBACK;

-- ─────────────────────────────────────────────
-- 20261023000006_bloque_validation_impayee.sql
-- ─────────────────────────────────────────────
\echo '=== Blocage de la validation impayée ==='
BEGIN;
\echo '--- 12. Un admin ne peut pas valider une inscription dont le paiement est en attente (attendu : erreur 23514), mais peut valider une payée'
INSERT INTO inscriptions (id, atelier_id, utilisateur_id, statut, statut_paiement) VALUES
  ('b1111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'en_attente', 'en_attente'),
  ('b2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 'en_attente', 'paye');
SELECT set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
SET LOCAL ROLE authenticated;
SAVEPOINT a;
UPDATE inscriptions SET statut = 'confirme' WHERE id = 'b1111111-1111-1111-1111-111111111111';
ROLLBACK TO a;
UPDATE inscriptions SET statut = 'confirme' WHERE id = 'b2222222-2222-2222-2222-222222222222';
RESET ROLE;
ROLLBACK;

BEGIN;
\echo '--- 13. valider_sans_paiement : motif obligatoire (attendu : erreur 22023), puis succès avec journal (attendu : confirme, 1 ligne de journal avec le motif)'
INSERT INTO inscriptions (id, atelier_id, utilisateur_id, statut, statut_paiement) VALUES
  ('b1111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'en_attente', 'en_attente');
SELECT set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
SET LOCAL ROLE authenticated;
SAVEPOINT a;
SELECT valider_sans_paiement('b1111111-1111-1111-1111-111111111111', '  ');
ROLLBACK TO a;
SELECT valider_sans_paiement('b1111111-1111-1111-1111-111111111111', 'Espèces sur place');
RESET ROLE;
SELECT statut, statut_paiement FROM inscriptions WHERE id = 'b1111111-1111-1111-1111-111111111111';
SELECT action, details->>'motif' AS motif FROM logs WHERE enregistrement_cible_id = 'b1111111-1111-1111-1111-111111111111';
ROLLBACK;

BEGIN;
\echo '--- 14. Une inscrite ne peut pas appeler valider_sans_paiement (attendu : erreur 42501)'
INSERT INTO inscriptions (id, atelier_id, utilisateur_id, statut, statut_paiement) VALUES
  ('b1111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'en_attente', 'en_attente');
SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
SET LOCAL ROLE authenticated;
SELECT valider_sans_paiement('b1111111-1111-1111-1111-111111111111', 'je me valide');
RESET ROLE;
ROLLBACK;
