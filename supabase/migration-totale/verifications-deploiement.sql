-- À lancer après migration-deploiement.sql : chaque ligne doit afficher ok = true.
-- Lecture seule. Fonctionne même si la migration n'est pas appliquée (les lignes affichent alors ok = false).
WITH controles(controle, ok) AS (
  VALUES
    ('Colonne utilisateurs.date_naissance supprimée', NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'utilisateurs' AND column_name = 'date_naissance')),
    ('Table espaces présente, table antennes absente', to_regclass('public.espaces') IS NOT NULL AND to_regclass('public.antennes') IS NULL),
    ('Colonne ateliers.espace_id',            EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ateliers' AND column_name = 'espace_id')),
    ('Colonne formule_espaces.espace_id',     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'formule_espaces' AND column_name = 'espace_id')),
    ('Plus aucune colonne ni table « antenne »', (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND (column_name ~ 'antenne' OR table_name ~ 'antenne')) = 0),
    ('Politiques espaces_admin et espaces_lecture', (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'espaces' AND policyname IN ('espaces_admin', 'espaces_lecture')) = 2),
    ('Fonction atelier_inclus réécrite (sans « antenne »)', COALESCE((SELECT pg_get_functiondef(to_regprocedure('public.atelier_inclus(uuid,uuid)')) !~ 'antenne'), false)),
    ('Fonction atelier_inclus ouverte aux visiteurs', COALESCE(has_function_privilege('anon', to_regprocedure('public.atelier_inclus(uuid,uuid)'), 'EXECUTE'), false))
)
SELECT controle, ok FROM controles
UNION ALL
SELECT '=> TOUT EST OK', bool_and(ok) FROM controles;
