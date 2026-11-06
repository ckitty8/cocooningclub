-- Scénarios de 20261106000000_espace_coworking.sql. Base « o » du bloc « Offre et adhésions »
-- (setup + 20261023000003), puis 20261024000003 (espaces) et la migration (jouée deux fois).
\set ON_ERROR_STOP off
\echo '--- 1. L''espace Coworking existe une seule fois (attendu : 1 ligne coworking)'
SELECT nom, slug FROM espaces ORDER BY nom;

\echo '--- 2. Coworking est compris exactement dans les formules qui couvrent Business (attendu : true)'
SELECT (
  SELECT array_agg(fe.formule_id ORDER BY fe.formule_id) FROM formule_espaces fe JOIN espaces e ON e.id = fe.espace_id WHERE e.slug = 'business'
) = (
  SELECT array_agg(fe.formule_id ORDER BY fe.formule_id) FROM formule_espaces fe JOIN espaces e ON e.id = fe.espace_id WHERE e.slug = 'coworking'
) AS coworking_suit_business;

\echo '--- 3. Formules et espaces couverts (attendu : la formule Business et la formule complète ont Coworking, pas la formule Créatif)'
SELECT f.nom, string_agg(e.slug, ', ' ORDER BY e.slug) AS espaces
FROM formules f JOIN formule_espaces fe ON fe.formule_id = f.id JOIN espaces e ON e.id = fe.espace_id
GROUP BY f.nom, f.ordre ORDER BY f.ordre;

\echo '--- 4. Rejouer la migration ne crée rien en double (attendu : 1 et le même nombre de rattachements)'
SELECT count(*) AS rattachements_avant FROM formule_espaces;
\i supabase/migrations/20261106000000_espace_coworking.sql
SELECT count(*) AS espaces_coworking FROM espaces WHERE slug = 'coworking';
SELECT count(*) AS rattachements_apres FROM formule_espaces;
