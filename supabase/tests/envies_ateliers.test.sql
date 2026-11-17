-- À lancer depuis la racine du dépôt, sur la base « t » du README (les trois setup de sécurité et les migrations
-- 20261015000000, 20261015000001 et 20261016000000), après 20261025000000_pre_inscriptions_secours.sql
-- puis 20261117000000_envies_ateliers.sql.
\set ON_ERROR_STOP 0
\set VERBOSITY terse
\echo '== 1. Une visiteuse dépose une envie : acceptée, textes tronqués, valeurs inconnues vidées (attendu : 100, 300, nouvelle, creatifs, NULL, {apres_midi,week_end})'
BEGIN; SET LOCAL ROLE anon;
INSERT INTO envies_ateliers (prenom, idee, espace, souhait, moments, statut)
VALUES (repeat('p', 500), repeat('i', 900), 'creatifs', 'n_importe_quoi', '{week_end,apres_midi,lune,week_end}', 'programmee');
RESET ROLE;
SELECT length(prenom) AS prenom, length(idee) AS idee, statut, espace, souhait, moments FROM envies_ateliers;
ROLLBACK;

\echo '== 2. Sans prénom : acceptée avec « Sans prénom » ; espace business refusé en douceur (attendu : Sans prénom, NULL)'
BEGIN; SET LOCAL ROLE anon; INSERT INTO envies_ateliers (prenom, espace) VALUES (NULL, 'business') \g /dev/null
RESET ROLE; SELECT prenom, espace FROM envies_ateliers; ROLLBACK;

\echo '== 3. Une visiteuse ne relit pas les envies (doit échouer)'
BEGIN; SET LOCAL ROLE anon; SELECT count(*) FROM envies_ateliers; ROLLBACK;

\echo '== 4. Une membre (non administratrice) dépose mais ne relit ni ne modifie (attendu : 0 ligne vue, 0 modifiée)'
BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true) \g /dev/null
INSERT INTO envies_ateliers (prenom, idee) VALUES ('Marie', 'Tricot');
SELECT count(*) AS vues_par_la_membre FROM envies_ateliers;
UPDATE envies_ateliers SET statut = 'retenue'; ROLLBACK;

\echo '== 5. Une administratrice relit, change le statut puis supprime (attendu : 1, retenue, 0)'
BEGIN; SET LOCAL ROLE anon; INSERT INTO envies_ateliers (prenom, idee) VALUES ('Léa', 'Bougies') \g /dev/null
RESET ROLE; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',true) \g /dev/null
SELECT count(*) AS vues_par_ladmin FROM envies_ateliers;
UPDATE envies_ateliers SET statut = 'retenue' RETURNING statut;
DELETE FROM envies_ateliers;
SELECT count(*) AS apres_suppression FROM envies_ateliers; ROLLBACK;

\echo '== 6. Statut inconnu refusé pour une administratrice (doit échouer)'
BEGIN; SET LOCAL ROLE anon; INSERT INTO envies_ateliers (prenom) VALUES ('Zoé') \g /dev/null
RESET ROLE; UPDATE envies_ateliers SET statut = 'perdue'; ROLLBACK;

\echo '== 7. Limite : 20 envies par heure et par IP passent, la 21e est refusée (attendu : erreur « Trop d''envois »)'
BEGIN; SET LOCAL ROLE anon; SELECT set_config('request.headers','{"cf-connecting-ip":"8.8.4.4"}',true) \g /dev/null
DO $$ BEGIN FOR i IN 1..20 LOOP INSERT INTO envies_ateliers (prenom) VALUES ('p' || i); END LOOP; END $$;
INSERT INTO envies_ateliers (prenom) VALUES ('21e'); ROLLBACK;

\echo '== 8. Réglage : lisible par une visiteuse, modifiable par une administratrice seulement (attendu : NULL, puis 0 ligne pour la membre, 50.00 pour l''admin)'
BEGIN; SET LOCAL ROLE anon; SELECT plafond_materiel FROM parametres_envies;
RESET ROLE; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true) \g /dev/null
UPDATE parametres_envies SET plafond_materiel = 999;
SELECT set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',true) \g /dev/null
UPDATE parametres_envies SET plafond_materiel = 50 RETURNING plafond_materiel; ROLLBACK;

\echo '== 9. Plafond négatif refusé ; une visiteuse ne peut pas modifier le réglage (deux erreurs attendues)'
BEGIN; UPDATE parametres_envies SET plafond_materiel = -1; ROLLBACK;
BEGIN; SET LOCAL ROLE anon; UPDATE parametres_envies SET plafond_materiel = 10; ROLLBACK;

\echo '== 10. La purge supprime les envies de plus de 3 ans (attendu : 1 supprimée, recente gardée)'
BEGIN;
CREATE TABLE IF NOT EXISTS visites_site (cree_le timestamptz);
ALTER TABLE ateliers ADD COLUMN IF NOT EXISTS date_atelier date;
ALTER TABLE inscriptions ADD COLUMN IF NOT EXISTS date_naissance date;
INSERT INTO envies_ateliers (prenom, cree_le) VALUES ('ancienne', now() - interval '37 months'), ('recente', now() - interval '1 month');
SELECT private.purger_donnees_anciennes() ->> 'envies_supprimees' AS supprimees;
SELECT string_agg(prenom, ',') AS restantes FROM envies_ateliers;
ROLLBACK;
