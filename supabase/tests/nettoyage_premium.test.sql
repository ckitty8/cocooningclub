-- À lancer depuis la racine du dépôt, après nettoyage_premium.setup.sql.
-- La migration est exécutée par ce fichier (\i), pas avant.
\set ON_ERROR_STOP 0
\set VERBOSITY terse
CREATE TABLE _avant AS SELECT schemaname, tablename, policyname, permissive, roles::text AS roles, cmd, qual, with_check FROM pg_policies;
SELECT count(*) AS policies_avant FROM _avant;
CREATE TABLE _vue_avant AS SELECT pg_get_viewdef('vue_suivi_inscriptions'::regclass) AS def, reloptions::text AS options, relacl::text AS acl FROM pg_class WHERE oid = 'vue_suivi_inscriptions'::regclass;

\echo '== 1. Un compte membre_premium subsiste (doit échouer, rien n''est modifié)'
BEGIN;
INSERT INTO utilisateurs (id, email, role) VALUES ('33333333-3333-3333-3333-333333333333', 'p@x.fr', 'membre_premium');
\i supabase/migrations/20261023000000_nettoyage_premium_et_mot_de_passe_hash.sql
ROLLBACK;
SELECT count(*) AS valeurs_role_apres_abandon FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'role_utilisateur';

\echo '== 2. Un document en accès premium subsiste (doit échouer)'
BEGIN;
INSERT INTO documents (titre, acces) VALUES ('Vieux', 'premium');
\i supabase/migrations/20261023000000_nettoyage_premium_et_mot_de_passe_hash.sql
ROLLBACK;

\echo '== 3. mot_de_passe_hash non vide (doit échouer)'
BEGIN;
UPDATE utilisateurs SET mot_de_passe_hash = 'x' WHERE email = 'membre@x.fr';
\i supabase/migrations/20261023000000_nettoyage_premium_et_mot_de_passe_hash.sql
ROLLBACK;

\echo '== 4. Migration sur la base saine (doit réussir)'
\i supabase/migrations/20261023000000_nettoyage_premium_et_mot_de_passe_hash.sql

\echo '== 5. Valeurs d''enum restantes (attendu : 3 rôles, 2 accès)'
SELECT t.typname, string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS valeurs
FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
WHERE t.typname IN ('role_utilisateur', 'acces_document') GROUP BY t.typname ORDER BY 1;

\echo '== 6. Aucun type résiduel *_ancien, colonne mot_de_passe_hash supprimée (attendu : 0 et 0)'
SELECT (SELECT count(*) FROM pg_type WHERE typname LIKE '%\_ancien') AS types_residuels,
       (SELECT count(*) FROM information_schema.columns WHERE table_name = 'utilisateurs' AND column_name = 'mot_de_passe_hash') AS colonne_restante;

\echo '== 7. Policies identiques avant / après (attendu : 0 ligne de différence)'
(SELECT * FROM _avant EXCEPT SELECT schemaname, tablename, policyname, permissive, roles::text, cmd, qual, with_check FROM pg_policies)
UNION ALL
(SELECT schemaname, tablename, policyname, permissive, roles::text, cmd, qual, with_check FROM pg_policies EXCEPT SELECT * FROM _avant);

\echo '== 7b. La vue vue_suivi_inscriptions est identique (définition, options, droits) (attendu : 0 ligne de différence)'
SELECT * FROM _vue_avant EXCEPT SELECT pg_get_viewdef('vue_suivi_inscriptions'::regclass), reloptions::text, relacl::text FROM pg_class WHERE oid = 'vue_suivi_inscriptions'::regclass;
SELECT count(*) AS vues_recreees FROM pg_views WHERE viewname = 'vue_suivi_inscriptions';

\echo '== 8. Valeur par défaut du rôle conservée (attendu : inscrit) et index recréé'
SELECT pg_get_expr(adbin, adrelid) AS defaut FROM pg_attrdef WHERE adrelid = 'utilisateurs'::regclass;
SELECT indexdef FROM pg_indexes WHERE indexname = 'idx_utilisateurs_role';

\echo '== 9. Les policies fonctionnent encore : un membre lit les documents "membres" et "tous" (attendu : 2), un visiteur seulement "tous" (attendu : 1)'
BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true) \g /dev/null
SELECT count(*) AS vus_par_membre FROM documents; ROLLBACK;
BEGIN; SET LOCAL ROLE anon; SELECT count(*) AS vus_par_visiteur FROM documents; ROLLBACK;

\echo '== 10. L''ancienne valeur n''existe plus (doit échouer)'
INSERT INTO utilisateurs (id, email, role) VALUES ('44444444-4444-4444-4444-444444444444', 'z@x.fr', 'membre_premium');

\echo '== 11. Migration rejouée une seconde fois (doit réussir, policies inchangées)'
\i supabase/migrations/20261023000000_nettoyage_premium_et_mot_de_passe_hash.sql
SELECT count(*) AS policies_apres FROM pg_policies;
