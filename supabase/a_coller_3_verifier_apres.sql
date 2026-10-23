-- =====================================================================
-- ÉTAPE 3/3 — À LANCER APRÈS les migrations (lecture seule, ne modifie rien)
-- =====================================================================
-- Chaque ligne doit afficher OK. Une ligne « A VERIFIER » dit quoi regarder.
-- =====================================================================
SELECT * FROM (
  SELECT 1 AS n, 'role_utilisateur sans premium' AS controle,
         (SELECT string_agg(enumlabel, ', ' ORDER BY enumsortorder) FROM pg_enum WHERE enumtypid = 'public.role_utilisateur'::regtype) AS valeur,
         CASE WHEN (SELECT string_agg(enumlabel, ', ' ORDER BY enumsortorder) FROM pg_enum WHERE enumtypid = 'public.role_utilisateur'::regtype) = 'administrateur, inscrit, membre' THEN 'OK' ELSE 'A VERIFIER' END AS statut
  UNION ALL
  SELECT 2, 'acces_document sans premium',
         (SELECT string_agg(enumlabel, ', ' ORDER BY enumsortorder) FROM pg_enum WHERE enumtypid = 'public.acces_document'::regtype),
         CASE WHEN (SELECT string_agg(enumlabel, ', ' ORDER BY enumsortorder) FROM pg_enum WHERE enumtypid = 'public.acces_document'::regtype) = 'membres, tous' THEN 'OK' ELSE 'A VERIFIER' END
  UNION ALL
  SELECT 3, 'Aucun type *_ancien résiduel',
         (SELECT count(*) FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname LIKE '%\_ancien')::text,
         CASE WHEN (SELECT count(*) FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname LIKE '%\_ancien') = 0 THEN 'OK' ELSE 'A VERIFIER' END
  UNION ALL
  SELECT 4, 'Policies (public + storage), avant : 51',
         (SELECT count(*) FROM pg_policies WHERE schemaname IN ('public','storage'))::text,
         CASE WHEN (SELECT count(*) FROM pg_policies WHERE schemaname IN ('public','storage')) = 51 THEN 'OK' ELSE 'A VERIFIER' END
  UNION ALL
  SELECT 5, 'Vue vue_suivi_inscriptions recréée, security_invoker, droits anon/authenticated',
         (SELECT COALESCE(array_to_string(reloptions, ','), 'sans option') || ' | ' || COALESCE(relacl::text, 'null') FROM pg_class WHERE oid = to_regclass('public.vue_suivi_inscriptions')),
         CASE WHEN (SELECT 'security_invoker=true' = ANY (reloptions) FROM pg_class WHERE oid = to_regclass('public.vue_suivi_inscriptions')) THEN 'OK' ELSE 'A VERIFIER' END
  UNION ALL
  SELECT 6, 'Colonne mot_de_passe_hash supprimée',
         (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='utilisateurs' AND column_name='mot_de_passe_hash')::text,
         CASE WHEN (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='utilisateurs' AND column_name='mot_de_passe_hash') = 0 THEN 'OK' ELSE 'A VERIFIER' END
  UNION ALL
  SELECT 7, 'Colonne utilisateurs.date_naissance supprimée',
         (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='utilisateurs' AND column_name='date_naissance')::text,
         CASE WHEN (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='utilisateurs' AND column_name='date_naissance') = 0 THEN 'OK' ELSE 'A VERIFIER' END
  UNION ALL
  SELECT 8, 'Table espaces + colonne ateliers.espace_id, plus aucune trace d''antenne',
         (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND (column_name ~ 'antenne' OR table_name ~ 'antenne'))::text || ' reste(s) ; espaces=' || COALESCE(to_regclass('public.espaces')::text, 'absente'),
         CASE WHEN to_regclass('public.espaces') IS NOT NULL
               AND (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND (column_name ~ 'antenne' OR table_name ~ 'antenne')) = 0
              THEN 'OK' ELSE 'A VERIFIER' END
  UNION ALL
  SELECT 9, 'Policies renommées (espaces_admin, espaces_lecture)',
         COALESCE((SELECT string_agg(policyname, ', ' ORDER BY policyname) FROM pg_policies WHERE tablename = 'espaces'), 'aucune'),
         CASE WHEN (SELECT count(*) FROM pg_policies WHERE tablename = 'espaces' AND policyname IN ('espaces_admin','espaces_lecture')) = 2 THEN 'OK' ELSE 'A VERIFIER' END
  UNION ALL
  SELECT 10, 'Tables de sauvegarde supprimées',
         (SELECT count(*) FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relname LIKE '%\_backup\_20260430')::text,
         CASE WHEN (SELECT count(*) FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relname LIKE '%\_backup\_20260430') = 0 THEN 'OK' ELSE 'A VERIFIER' END
  UNION ALL
  SELECT 11, 'Fonction de purge présente et fermée au public',
         COALESCE((SELECT 'anon:' || has_function_privilege('anon', p.oid, 'EXECUTE') || ' authenticated:' || has_function_privilege('authenticated', p.oid, 'EXECUTE')
                   FROM pg_proc p WHERE p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'private') AND p.proname = 'purger_donnees_anciennes'), 'absente'),
         CASE WHEN (SELECT NOT has_function_privilege('anon', p.oid, 'EXECUTE') AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE')
                    FROM pg_proc p WHERE p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'private') AND p.proname = 'purger_donnees_anciennes') THEN 'OK' ELSE 'A VERIFIER' END
  UNION ALL
  SELECT 12, 'pg_cron actif',
         COALESCE((SELECT installed_version FROM pg_available_extensions WHERE name = 'pg_cron'), 'non disponible'),
         CASE WHEN (SELECT installed_version FROM pg_available_extensions WHERE name = 'pg_cron') IS NOT NULL THEN 'OK' ELSE 'A VERIFIER : activer pg_cron (Database > Extensions) puis relancer le dernier bloc DO de l''étape 2' END
  UNION ALL
  SELECT 13, 'Jobs planifiés (purge + dépublication)',
         COALESCE(CASE WHEN to_regclass('cron.job') IS NOT NULL
                       THEN (xpath('/row/c/text()', query_to_xml('SELECT string_agg(jobname || '' '' || schedule, '' ; '') AS c FROM cron.job WHERE jobname IN (''purger_donnees_anciennes_daily'',''depublier_ateliers_passes_daily'')', false, true, '')))[1]::text END, 'aucun'),
         CASE WHEN to_regclass('cron.job') IS NOT NULL
               AND (xpath('/row/c/text()', query_to_xml('SELECT count(*) AS c FROM cron.job WHERE jobname IN (''purger_donnees_anciennes_daily'',''depublier_ateliers_passes_daily'')', false, true, '')))[1]::text = '2'
              THEN 'OK' ELSE 'A VERIFIER (voir ligne 12)' END
) t ORDER BY n;
