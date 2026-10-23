-- À lancer depuis la racine du dépôt, après conservation_des_donnees.setup.sql
-- et la migration 20261023000001_conservation_des_donnees.sql.
\set ON_ERROR_STOP 0
\set VERBOSITY terse
\echo '== 1. Purge (attendu : 1 visite, 1 entrée de journal, 1 message supprimés ; 1 invité anonymisé)'
SELECT private.purger_donnees_anciennes();

\echo '== 2. Données restantes (attendu : visites 2, journal 1, messages 1)'
SELECT (SELECT count(*) FROM visites_site) AS visites, (SELECT count(*) FROM logs) AS journal, (SELECT count(*) FROM contact_messages) AS messages;

\echo '== 3. Invité ancien anonymisé, invité récent et membre intacts'
SELECT id, nom_invite, prenom_invite, email_invite, telephone_invite, date_naissance, present FROM inscriptions ORDER BY id;

\echo '== 4. Rejouer la purge ne change plus rien (attendu : 0 partout)'
SELECT private.purger_donnees_anciennes();

\echo '== 5. Ni anon ni authenticated ne peuvent la lancer (doit échouer deux fois)'
BEGIN; SET LOCAL ROLE anon; SELECT private.purger_donnees_anciennes(); ROLLBACK;
BEGIN; SET LOCAL ROLE authenticated; SELECT private.purger_donnees_anciennes(); ROLLBACK;
