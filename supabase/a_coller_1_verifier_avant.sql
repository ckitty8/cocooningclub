-- =====================================================================
-- ÉTAPE 1/3 — À LANCER AVANT les migrations (lecture seule, ne modifie rien)
-- =====================================================================
-- À coller dans le SQL Editor Supabase. Chaque ligne du résultat a un statut :
--   OK        rien à faire
--   A REGLER  à corriger avant de lancer l'étape 2
--   INFO      pour information
-- =====================================================================
SELECT * FROM (
  SELECT 1 AS n, 'Comptes encore membre_premium' AS controle,
         (SELECT count(*) FROM public.utilisateurs WHERE role::text = 'membre_premium')::text AS valeur,
         '0' AS attendu,
         CASE WHEN (SELECT count(*) FROM public.utilisateurs WHERE role::text = 'membre_premium') = 0 THEN 'OK' ELSE 'A REGLER' END AS statut
  UNION ALL
  SELECT 2, 'Documents encore en accès premium',
         (SELECT count(*) FROM public.documents WHERE acces::text = 'premium')::text, '0',
         CASE WHEN (SELECT count(*) FROM public.documents WHERE acces::text = 'premium') = 0 THEN 'OK' ELSE 'A REGLER' END
  UNION ALL
  SELECT 3, 'Comptes avec un mot_de_passe_hash rempli',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='utilisateurs' AND column_name='mot_de_passe_hash')
              THEN (SELECT count(*) FROM public.utilisateurs WHERE mot_de_passe_hash IS NOT NULL)::text ELSE 'colonne déjà supprimée' END,
         '0',
         CASE WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='utilisateurs' AND column_name='mot_de_passe_hash')
                OR (SELECT count(*) FROM public.utilisateurs WHERE mot_de_passe_hash IS NOT NULL) = 0 THEN 'OK' ELSE 'A REGLER' END
  UNION ALL
  SELECT 4, 'Dates de naissance sur les comptes (seront supprimées, étape 3 de la migration)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='utilisateurs' AND column_name='date_naissance')
              THEN (SELECT count(*) FROM public.utilisateurs WHERE date_naissance IS NOT NULL)::text ELSE 'colonne déjà supprimée' END,
         'à savoir', 'INFO'
  UNION ALL
  SELECT 5, 'Valeurs de role_utilisateur',
         (SELECT string_agg(enumlabel, ', ' ORDER BY enumsortorder) FROM pg_enum WHERE enumtypid = 'public.role_utilisateur'::regtype),
         'administrateur, inscrit, membre, membre_premium (avant)',
         'INFO'
  UNION ALL
  SELECT 6, 'Vues qui lisent role / acces (recréées automatiquement)',
         COALESCE((SELECT string_agg(DISTINCT c.relname, ', ')
                   FROM pg_depend d
                   JOIN pg_rewrite r ON d.classid = 'pg_rewrite'::regclass AND d.objid = r.oid
                   JOIN pg_class c ON c.oid = r.ev_class AND c.relkind = 'v'
                   JOIN pg_attribute a ON a.attrelid = d.refobjid AND a.attnum = d.refobjsubid
                   WHERE d.refclassid = 'pg_class'::regclass
                     AND ((a.attrelid = 'public.utilisateurs'::regclass AND a.attname = 'role')
                       OR (a.attrelid = 'public.documents'::regclass AND a.attname = 'acces'))), 'aucune'),
         'vue_suivi_inscriptions', 'INFO'
  UNION ALL
  SELECT 7, 'Vues construites sur une autre vue (feraient échouer l''étape 1)',
         (SELECT count(*) FROM pg_depend d
            JOIN pg_rewrite r ON d.classid = 'pg_rewrite'::regclass AND d.objid = r.oid
            JOIN pg_class c ON c.oid = r.ev_class AND c.relkind = 'v'
            WHERE d.refobjid = 'public.vue_suivi_inscriptions'::regclass AND c.oid <> d.refobjid)::text,
         '0',
         CASE WHEN (SELECT count(*) FROM pg_depend d
            JOIN pg_rewrite r ON d.classid = 'pg_rewrite'::regclass AND d.objid = r.oid
            JOIN pg_class c ON c.oid = r.ev_class AND c.relkind = 'v'
            WHERE d.refobjid = 'public.vue_suivi_inscriptions'::regclass AND c.oid <> d.refobjid) = 0 THEN 'OK' ELSE 'A REGLER' END
  UNION ALL
  SELECT 8, 'Table antennes (à renommer en espaces)',
         CASE WHEN to_regclass('public.antennes') IS NOT NULL THEN 'antennes' WHEN to_regclass('public.espaces') IS NOT NULL THEN 'déjà espaces' ELSE 'introuvable' END,
         'antennes ou espaces',
         CASE WHEN to_regclass('public.antennes') IS NOT NULL OR to_regclass('public.espaces') IS NOT NULL THEN 'OK' ELSE 'A REGLER' END
  UNION ALL
  SELECT 9, 'Tables de sauvegarde à supprimer',
         COALESCE((SELECT string_agg(relname, ', ') FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relname LIKE '%\_backup\_20260430'), 'aucune'),
         'inscriptions_backup_20260430, transactions_paypal_backup_20260430', 'INFO'
  UNION ALL
  SELECT 10, 'Extension pg_cron',
         COALESCE((SELECT installed_version FROM pg_available_extensions WHERE name = 'pg_cron'), 'non disponible'),
         'une version (sinon l''étape 2 ne planifie pas la purge)',
         CASE WHEN (SELECT installed_version FROM pg_available_extensions WHERE name = 'pg_cron') IS NOT NULL THEN 'OK' ELSE 'INFO' END
  UNION ALL
  SELECT 11, 'Rôle utilisé (doit pouvoir modifier storage.objects)', current_user, 'postgres', 'INFO'
) t ORDER BY n;
