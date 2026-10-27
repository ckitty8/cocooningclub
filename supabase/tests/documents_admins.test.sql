-- Scénarios de 20261026000003_documents_admins.sql (tout est annulé à la fin).
-- Base « t6 » : nettoyage_premium.setup.sql + 20261024000000_nettoyage_premium_et_mot_de_passe_hash.sql + la migration (voir README).
\set ON_ERROR_STOP off
-- utilisateurs : 1111 membre, 2222 administrateur.

\echo '--- 1. La valeur existe (attendu : membres, tous, admins)'
SELECT string_agg(enumlabel, ', ' ORDER BY enumsortorder) FROM pg_enum WHERE enumtypid = 'public.acces_document'::regtype;

INSERT INTO documents (titre, acces) VALUES ('Bulletin vierge', 'admins');

BEGIN;
\echo '--- 2. Une administratrice voit tous les documents (attendu : 3)'
SELECT set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
SET LOCAL ROLE authenticated;
SELECT count(*) AS vus_par_admin FROM documents;
ROLLBACK;

BEGIN;
\echo '--- 3. Une membre ne voit pas le document réservé (attendu : 2 documents, sans « Bulletin vierge »)'
SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
SET LOCAL ROLE authenticated;
SELECT titre FROM documents ORDER BY titre;
ROLLBACK;

BEGIN;
\echo '--- 4. Un visiteur ne le voit pas non plus (attendu : 1, « Flyer »)'
SET LOCAL ROLE anon;
SELECT titre FROM documents;
ROLLBACK;

BEGIN;
\echo '--- 5. Une membre ne peut ni le créer ni le rendre visible (attendu : erreur de droits ou 0 ligne modifiée)'
SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
SET LOCAL ROLE authenticated;
UPDATE documents SET acces = 'membres' WHERE titre = 'Bulletin vierge';
INSERT INTO documents (titre, acces) VALUES ('Intrus', 'admins');
ROLLBACK;
