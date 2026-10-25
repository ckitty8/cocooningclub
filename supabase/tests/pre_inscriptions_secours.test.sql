-- À lancer depuis la racine du dépôt, sur la base « t » du README (les trois setup de sécurité et les migrations
-- 20261015000000, 20261015000001 et 20261016000000), après 20261025000000_pre_inscriptions_secours.sql.
\set ON_ERROR_STOP 0
\set VERBOSITY terse
\echo '== 1. Un visiteur dépose une demande aux champs démesurés : acceptée et tronquée (attendu : 200, 255, 40, 300, 500)'
BEGIN; SET LOCAL ROLE anon;
INSERT INTO pre_inscriptions_secours (nom, email, telephone, atelier_titre, erreur)
VALUES (repeat('n', 500), repeat('e', 600), repeat('9', 100), repeat('t', 900), repeat('x', 2000));
RESET ROLE;
SELECT length(nom) AS nom, length(email) AS email, length(telephone) AS tel, length(atelier_titre) AS atelier, length(erreur) AS erreur FROM pre_inscriptions_secours;
ROLLBACK;

\echo '== 2. Sans aucune information : acceptée avec le nom « Sans nom » (attendu : Sans nom)'
BEGIN; SET LOCAL ROLE anon; INSERT INTO pre_inscriptions_secours (nom) VALUES (NULL) \g /dev/null
RESET ROLE; SELECT nom FROM pre_inscriptions_secours; ROLLBACK;

\echo '== 3. Un visiteur ne peut pas relire les demandes (doit échouer)'
BEGIN; SET LOCAL ROLE anon; SELECT count(*) FROM pre_inscriptions_secours; ROLLBACK;

\echo '== 4. Un membre (non administrateur) dépose une demande mais ne la relit pas (attendu : INSERT puis 0 ligne)'
BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true) \g /dev/null
INSERT INTO pre_inscriptions_secours (nom, email) VALUES ('Marie', 'm@x.fr');
SELECT count(*) AS lignes_vues_par_le_membre FROM pre_inscriptions_secours;
DELETE FROM pre_inscriptions_secours; ROLLBACK;

\echo '== 5. Un administrateur relit puis supprime (attendu : 1 puis 0)'
BEGIN; SET LOCAL ROLE anon; INSERT INTO pre_inscriptions_secours (nom) VALUES ('Léa') \g /dev/null
RESET ROLE; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',true) \g /dev/null
SELECT count(*) AS vues_par_ladmin FROM pre_inscriptions_secours;
DELETE FROM pre_inscriptions_secours;
SELECT count(*) AS apres_suppression FROM pre_inscriptions_secours; ROLLBACK;

\echo '== 6. Limite très large : 60 dépôts par heure et par IP passent, le 61e est refusé (attendu : 60 puis erreur)'
BEGIN; SET LOCAL ROLE anon; SELECT set_config('request.headers','{"cf-connecting-ip":"8.8.8.8"}',true) \g /dev/null
DO $$ BEGIN FOR i IN 1..60 LOOP INSERT INTO pre_inscriptions_secours (nom) VALUES ('p' || i); END LOOP; END $$;
INSERT INTO pre_inscriptions_secours (nom) VALUES ('61e'); ROLLBACK;

\echo '== 7. La purge quotidienne supprime les demandes de plus de 6 mois (attendu : 1 supprimée, 1 gardée)'
BEGIN;
-- Colonnes que la purge lit et que les bases de test minimales n'ont pas toujours.
CREATE TABLE IF NOT EXISTS visites_site (cree_le timestamptz);
ALTER TABLE ateliers ADD COLUMN IF NOT EXISTS date_atelier date;
ALTER TABLE inscriptions ADD COLUMN IF NOT EXISTS date_naissance date;
INSERT INTO pre_inscriptions_secours (nom, cree_le) VALUES ('ancienne', now() - interval '7 months'), ('recente', now() - interval '1 month');
SELECT private.purger_donnees_anciennes() ->> 'demandes_secours_supprimees' AS supprimees;
SELECT string_agg(nom, ',') AS restantes FROM pre_inscriptions_secours;
ROLLBACK;
