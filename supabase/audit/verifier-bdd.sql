-- Audit de la base (LECTURE SEULE) : chaque ligne renvoyée est un écart à examiner.
-- À lancer dans le SQL Editor Supabase (ou avec l'outil execute_sql), jamais de modification ici.
-- Colonnes : controle, gravite (erreur | avertissement), objet, detail.

-- ─── Structure et sécurité ───────────────────────────────────────
SELECT 'Table sans RLS' AS controle, 'erreur' AS gravite, c.relname AS objet, '' AS detail
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
UNION ALL
SELECT 'RLS activée mais aucune politique', 'erreur', c.relname, ''
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
  AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = c.relname)
UNION ALL
SELECT 'Table de sauvegarde oubliée', 'avertissement', c.relname, 'à supprimer une fois la sauvegarde inutile (accord de l''utilisatrice)'
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname ~ '_backup_'
UNION ALL
SELECT 'Table sans clé primaire', 'erreur', c.relname, ''
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
  AND NOT EXISTS (SELECT 1 FROM pg_constraint k WHERE k.conrelid = c.oid AND k.contype = 'p')
UNION ALL
-- Les droits (GRANT) d'écriture de anon existent par défaut sur Supabase : c'est la RLS qui protège.
-- On liste donc les POLITIQUES qui laissent un visiteur écrire : seules les écritures voulues
-- (pré-inscription, message de contact, visite) doivent apparaître.
SELECT 'Politique d''écriture ouverte aux visiteurs', 'avertissement', tablename || ' · ' || policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND roles::text ~ '(anon|public)' AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  AND tablename NOT IN ('inscriptions', 'contact_messages', 'visites_site')
UNION ALL
SELECT 'Fonction SECURITY DEFINER sans search_path', 'erreur', p.proname, ''
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname IN ('public', 'private') AND p.prosecdef
  AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig, '{}')) cfg WHERE cfg LIKE 'search_path=%')
UNION ALL
SELECT 'Fonction publique appelable par anon', 'avertissement', p.proname, 'à confirmer : voulu pour un visiteur ?'
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prokind = 'f'
  AND has_function_privilege('anon', p.oid, 'EXECUTE')
  AND p.proname NOT IN ('temoignages_publics', 'atelier_inclus')
  AND p.prorettype <> 'trigger'::regtype
UNION ALL
SELECT 'Clé étrangère sans index', 'avertissement', k.conrelid::regclass::text, k.conname
FROM pg_constraint k
WHERE k.contype = 'f' AND k.connamespace = 'public'::regnamespace
  AND NOT EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid = k.conrelid AND (i.indkey::int2[])[0] = k.conkey[1])
UNION ALL
SELECT 'Vue sans security_invoker', 'erreur', c.relname, 'une vue contourne la RLS de l''appelant'
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'v'
  AND NOT coalesce(c.reloptions::text[] && ARRAY['security_invoker=true', 'security_invoker=on'], false)

-- ─── Données (nécessitent les tables du site) ────────────────────
UNION ALL
SELECT 'Inscription confirmée au paiement en attente', 'erreur', i.id::text, 'devrait être bloquée (migration 000006) ou dérogation journalisée'
FROM public.inscriptions i
WHERE i.statut = 'confirme' AND i.statut_paiement = 'en_attente'
  AND NOT EXISTS (SELECT 1 FROM public.logs l WHERE l.enregistrement_cible_id = i.id AND l.action = 'inscription.validate_sans_paiement')
UNION ALL
SELECT 'Places incohérentes', 'erreur', a.id::text,
       a.titre || ' : places_disponibles=' || a.places_disponibles || ', attendu=' || greatest(a.places_max - count(i.id), 0)
FROM public.ateliers a
LEFT JOIN public.inscriptions i ON i.atelier_id = a.id AND i.statut = 'confirme'
GROUP BY a.id, a.titre, a.places_max, a.places_disponibles
HAVING a.places_disponibles <> greatest(a.places_max - count(i.id), 0)
UNION ALL
SELECT 'Atelier sans espace', 'erreur', a.id::text, a.titre
FROM public.ateliers a WHERE a.espace_id IS NULL
UNION ALL
SELECT 'Atelier payant sans tarif', 'avertissement', a.id::text, a.titre
FROM public.ateliers a WHERE a.tarif_standard IS NULL
UNION ALL
SELECT 'Doublon d''email', 'erreur', lower(email), count(*)::text || ' comptes'
FROM public.utilisateurs WHERE email IS NOT NULL
GROUP BY lower(email) HAVING count(*) > 1
UNION ALL
SELECT 'Compte de connexion sans fiche utilisateur', 'avertissement', u.id::text, u.email
FROM auth.users u LEFT JOIN public.utilisateurs p ON p.id = u.id WHERE p.id IS NULL
UNION ALL
SELECT 'Fiche utilisateur sans compte de connexion', 'avertissement', p.id::text, p.email
FROM public.utilisateurs p LEFT JOIN auth.users u ON u.id = p.id WHERE u.id IS NULL
UNION ALL
SELECT 'Membre sans adhésion en cours', 'avertissement', p.id::text, p.email
FROM public.utilisateurs p
WHERE p.role = 'membre' AND p.est_actif
  AND NOT EXISTS (SELECT 1 FROM public.adhesions a WHERE a.utilisateur_id = p.id AND a.statut = 'active' AND a.valable_jusqu_au >= current_date)
UNION ALL
SELECT 'Adhésion échue toujours active', 'erreur', a.id::text, 'valable jusqu''au ' || a.valable_jusqu_au || ' : lancer expirer_adhesions()'
FROM public.adhesions a WHERE a.statut = 'active' AND a.valable_jusqu_au < current_date
UNION ALL
SELECT 'Consentement photo sans date de signature', 'erreur', a.id::text, ''
FROM public.adhesions a WHERE a.autorisation_image AND a.image_signee_le IS NULL
UNION ALL
SELECT 'Compte au rôle interdit (membre_premium)', 'erreur', p.id::text, p.email
FROM public.utilisateurs p WHERE p.role::text = 'membre_premium'
ORDER BY 2, 1, 3;

-- ─── Comparaison migrations ↔ base (à faire à la main) ───────────
-- Lister les objets de la base, puis vérifier que chacun est créé par un fichier de supabase/migrations/ :
--   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1;
--   SELECT proname FROM pg_proc WHERE pronamespace IN ('public'::regnamespace, 'private'::regnamespace) ORDER BY 1;
--   SELECT version FROM supabase_migrations.schema_migrations ORDER BY 1;
-- Fonctions jamais appelées : pour chaque nom `f` de public, `grep -rn "rpc(\"f\"" src/` ; sinon c'est du code mort.
