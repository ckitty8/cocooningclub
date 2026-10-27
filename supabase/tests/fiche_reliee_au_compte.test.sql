-- Scénarios de 20261026000002_fiche_reliee_au_compte_en_cascade.sql (tout est annulé à la fin).
-- À lancer sur la base « o » (voir README), après la migration.
\set ON_ERROR_STOP off

\echo '--- 1. Toutes les clés étrangères vers utilisateurs suivent le changement d''identifiant (attendu : 0 ligne sans cascade)'
SELECT conrelid::regclass AS table_ref, conname FROM pg_constraint WHERE confrelid = 'public.utilisateurs'::regclass AND contype = 'f' AND confupdtype <> 'c';

BEGIN;
\echo '--- 2. Une fiche avec adhésion peut être reliée à son compte de connexion : l''adhésion suit (attendu : UPDATE 1, puis 1 adhésion sur le nouvel identifiant, 0 sur l''ancien)'
INSERT INTO utilisateurs (id, email, role) VALUES ('77777777-7777-7777-7777-777777777777','sans-connexion@x.fr','inscrit');
INSERT INTO adhesions (utilisateur_id, formule_id) SELECT '77777777-7777-7777-7777-777777777777', id FROM formules LIMIT 1;
UPDATE utilisateurs SET id = '88888888-8888-8888-8888-888888888888' WHERE email = 'sans-connexion@x.fr';
SELECT count(*) FILTER (WHERE utilisateur_id = '88888888-8888-8888-8888-888888888888') AS sur_le_nouvel_id,
       count(*) FILTER (WHERE utilisateur_id = '77777777-7777-7777-7777-777777777777') AS sur_l_ancien
  FROM adhesions;
ROLLBACK;

BEGIN;
\echo '--- 3. La suppression d''une fiche emporte toujours ses adhésions (attendu : 0 adhésion)'
INSERT INTO utilisateurs (id, email, role) VALUES ('77777777-7777-7777-7777-777777777777','sans-connexion@x.fr','inscrit');
INSERT INTO adhesions (utilisateur_id, formule_id) SELECT '77777777-7777-7777-7777-777777777777', id FROM formules LIMIT 1;
DELETE FROM utilisateurs WHERE email = 'sans-connexion@x.fr';
SELECT count(*) AS adhesions_restantes FROM adhesions WHERE utilisateur_id = '77777777-7777-7777-7777-777777777777';
ROLLBACK;
