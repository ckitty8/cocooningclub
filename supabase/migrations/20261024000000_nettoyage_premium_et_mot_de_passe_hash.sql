-- =====================================================
-- Nettoyage du schéma : restes de l'offre premium et colonne de mot de passe
-- =====================================================
-- 1. Retire 'membre_premium' de role_utilisateur et 'premium' de
--    acces_document. La migration 20260429000012 avait supprimé l'offre mais
--    laissé ces valeurs d'enum, faute de pouvoir recréer à la main la
--    quarantaine de policies qui en dépendent. Ici les policies sont
--    relevées dans le catalogue (pg_policy), supprimées, puis recréées à
--    l'identique après le changement de type : aucune liste codée en dur,
--    donc pas de dérive possible avec la base réelle.
--
-- 2. Supprime utilisateurs.mot_de_passe_hash : l'authentification passe par
--    Supabase Auth, la colonne n'est lue ni écrite par le site.
--
-- Les vues qui exposent ces colonnes (en prod : vue_suivi_inscriptions, qui
-- sélectionne utilisateurs.role) sont supprimées puis recréées avec la même
-- définition, les mêmes options (security_invoker) et les mêmes droits.
--
-- Tout est dans un seul bloc : en cas d'erreur (valeur encore utilisée,
-- vue ou règle dépendante non gérée, colonne non vide), RIEN n'est modifié
-- et le message dit pourquoi.
-- =====================================================

DO $$
DECLARE
  v_cible   RECORD;
  v_pol     RECORD;
  v_defauts JSONB := '{}';
  v_def     TEXT;
  v_oid_old OID;
  v_oid_tab OID;
  v_attnum  INT;
  v_policies JSONB := '[]';
  v_vues    JSONB := '[]';
  v_vue     RECORD;
  v_n       INT;
BEGIN
  -- Les types dans les définitions de policy doivent s'écrire sans schéma.
  PERFORM set_config('search_path', 'public, pg_catalog', true);

  -- ── Gardes : aucune ligne ne doit encore utiliser les valeurs retirées ──
  SELECT count(*) INTO v_n FROM public.utilisateurs WHERE role::text = 'membre_premium';
  IF v_n > 0 THEN
    RAISE EXCEPTION 'Abandon : % compte(s) ont encore le rôle membre_premium. Les passer à "membre" d''abord.', v_n;
  END IF;
  SELECT count(*) INTO v_n FROM public.documents WHERE acces::text = 'premium';
  IF v_n > 0 THEN
    RAISE EXCEPTION 'Abandon : % document(s) ont encore l''accès "premium". Les passer à "membres" d''abord.', v_n;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'utilisateurs' AND column_name = 'mot_de_passe_hash'
  ) THEN
    EXECUTE 'SELECT count(*) FROM public.utilisateurs WHERE mot_de_passe_hash IS NOT NULL' INTO v_n;
    IF v_n > 0 THEN
      RAISE EXCEPTION 'Abandon : % compte(s) ont une valeur dans mot_de_passe_hash. Vérifier avant de supprimer la colonne.', v_n;
    END IF;
  END IF;

  -- ── Relevé puis suppression des vues qui lisent role / acces ──
  FOR v_vue IN
    SELECT DISTINCT n.nspname AS schema_nom, c.relname AS vue_nom, c.oid AS vue_oid,
           pg_get_viewdef(c.oid) AS def, c.reloptions AS options,
           pg_get_userbyid(c.relowner) AS proprietaire,
           (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                     'grantee', CASE WHEN x.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
                     'priv', x.privilege_type)), '[]'::jsonb)
              FROM aclexplode(c.relacl) x) AS droits
    FROM pg_depend d
    JOIN pg_rewrite r ON d.classid = 'pg_rewrite'::regclass AND d.objid = r.oid
    JOIN pg_class c ON c.oid = r.ev_class AND c.relkind = 'v'
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = d.refobjid AND a.attnum = d.refobjsubid
    WHERE d.refclassid = 'pg_class'::regclass
      AND ((a.attrelid = 'public.utilisateurs'::regclass AND a.attname = 'role')
        OR (a.attrelid = 'public.documents'::regclass    AND a.attname = 'acces'))
  LOOP
    v_vues := v_vues || jsonb_build_object(
      'schema', v_vue.schema_nom, 'name', v_vue.vue_nom,
      'def', rtrim(v_vue.def, E'; \n'), 'opts', to_jsonb(v_vue.options),
      'owner', v_vue.proprietaire, 'acl', v_vue.droits);
    -- Sans CASCADE : une vue construite sur cette vue fait échouer (donc annule) la migration.
    EXECUTE format('DROP VIEW %I.%I', v_vue.schema_nom, v_vue.vue_nom);
  END LOOP;

  -- ── Relevé puis suppression des policies qui dépendent des deux types ──
  FOR v_cible IN
    SELECT * FROM (VALUES
      ('role_utilisateur', 'utilisateurs', 'role'),
      ('acces_document',   'documents',    'acces')
    ) AS t(type_nom, table_nom, colonne)
  LOOP
    SELECT oid INTO v_oid_old FROM pg_type
      WHERE typname = v_cible.type_nom AND typnamespace = 'public'::regnamespace;
    SELECT c.oid, a.attnum INTO v_oid_tab, v_attnum
      FROM pg_class c JOIN pg_attribute a ON a.attrelid = c.oid
      WHERE c.relnamespace = 'public'::regnamespace
        AND c.relname = v_cible.table_nom AND a.attname = v_cible.colonne;

    FOR v_pol IN
      SELECT DISTINCT pl.schemaname, pl.tablename, pl.policyname, pl.permissive,
             pl.roles, pl.cmd, pl.qual, pl.with_check
      FROM pg_depend d
      JOIN pg_policy p ON d.classid = 'pg_policy'::regclass AND d.objid = p.oid
      JOIN pg_class pc ON pc.oid = p.polrelid
      JOIN pg_namespace pn ON pn.oid = pc.relnamespace
      JOIN pg_policies pl ON pl.schemaname = pn.nspname
                         AND pl.tablename = pc.relname AND pl.policyname = p.polname
      WHERE (d.refclassid = 'pg_type'::regclass  AND d.refobjid = v_oid_old)
         OR (d.refclassid = 'pg_class'::regclass AND d.refobjid = v_oid_tab AND d.refobjsubid = v_attnum)
    LOOP
      v_policies := v_policies || jsonb_build_object(
        'schema', v_pol.schemaname, 'table', v_pol.tablename, 'name', v_pol.policyname,
        'permissive', v_pol.permissive, 'roles', to_jsonb(v_pol.roles), 'cmd', v_pol.cmd,
        'qual', v_pol.qual, 'check', v_pol.with_check);
      EXECUTE format('DROP POLICY %I ON %I.%I', v_pol.policyname, v_pol.schemaname, v_pol.tablename);
    END LOOP;
  END LOOP;

  -- ── Recréation des deux types sans les valeurs retirées ──
  FOR v_cible IN
    SELECT * FROM (VALUES
      ('role_utilisateur', 'utilisateurs', 'role',  ARRAY['administrateur','inscrit','membre']),
      ('acces_document',   'documents',    'acces', ARRAY['membres','tous'])
    ) AS t(type_nom, table_nom, colonne, valeurs)
  LOOP
    -- Les valeurs conservées doivent être exactement celles du type actuel,
    -- moins la valeur retirée : sinon une valeur ajoutée entre-temps serait perdue.
    IF (SELECT array_agg(e.enumlabel::text ORDER BY e.enumlabel)
        FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = v_cible.type_nom AND t.typnamespace = 'public'::regnamespace
          AND e.enumlabel NOT IN ('membre_premium', 'premium'))
       IS DISTINCT FROM (SELECT array_agg(x ORDER BY x) FROM unnest(v_cible.valeurs) x) THEN
      RAISE EXCEPTION 'Abandon : le type % contient des valeurs inattendues (mettre la migration à jour).', v_cible.type_nom;
    END IF;

    SELECT pg_get_expr(ad.adbin, ad.adrelid) INTO v_def
      FROM pg_attrdef ad JOIN pg_attribute a ON a.attrelid = ad.adrelid AND a.attnum = ad.adnum
      WHERE ad.adrelid = format('public.%I', v_cible.table_nom)::regclass AND a.attname = v_cible.colonne;
    IF v_def IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP DEFAULT', v_cible.table_nom, v_cible.colonne);
      v_defauts := v_defauts || jsonb_build_object(v_cible.type_nom, v_def);
    END IF;

    EXECUTE format('ALTER TYPE public.%I RENAME TO %I', v_cible.type_nom, v_cible.type_nom || '_ancien');
    EXECUTE format('CREATE TYPE public.%I AS ENUM (%s)', v_cible.type_nom,
                   (SELECT string_agg(quote_literal(v), ', ') FROM unnest(v_cible.valeurs) v));
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I TYPE public.%I USING %I::text::public.%I',
                   v_cible.table_nom, v_cible.colonne, v_cible.type_nom, v_cible.colonne, v_cible.type_nom);
    IF v_defauts ? v_cible.type_nom THEN
      -- Le type recréé porte le même nom : la valeur par défaut se réécrit telle quelle.
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I SET DEFAULT %s',
                     v_cible.table_nom, v_cible.colonne, v_defauts ->> v_cible.type_nom);
    END IF;
  END LOOP;

  -- ── Recréation des vues, à l'identique (définition, options, droits) ──
  FOR v_pol IN SELECT * FROM jsonb_array_elements(v_vues) AS j(p) LOOP
    EXECUTE format('CREATE VIEW %I.%I %s AS %s',
      v_pol.p ->> 'schema', v_pol.p ->> 'name',
      CASE WHEN jsonb_typeof(v_pol.p -> 'opts') = 'array'
           THEN 'WITH (' || (SELECT string_agg(o, ', ') FROM jsonb_array_elements_text(v_pol.p -> 'opts') o) || ')'
           ELSE '' END,
      v_pol.p ->> 'def');
    -- Une vue neuve reçoit les droits par défaut du schéma : on repart de zéro.
    FOR v_cible IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated', 'service_role') LOOP
      EXECUTE format('REVOKE ALL ON %I.%I FROM %I', v_pol.p ->> 'schema', v_pol.p ->> 'name', v_cible.rolname);
    END LOOP;
    FOR v_cible IN
      SELECT g ->> 'grantee' AS grantee, g ->> 'priv' AS priv
      FROM jsonb_array_elements(v_pol.p -> 'acl') g
      WHERE g ->> 'grantee' <> (v_pol.p ->> 'owner')
    LOOP
      EXECUTE format('GRANT %s ON %I.%I TO %s', v_cible.priv, v_pol.p ->> 'schema', v_pol.p ->> 'name',
                     CASE WHEN v_cible.grantee = 'PUBLIC' THEN 'PUBLIC' ELSE quote_ident(v_cible.grantee) END);
    END LOOP;
  END LOOP;

  -- ── Recréation des policies, à l'identique ──
  FOR v_pol IN SELECT * FROM jsonb_array_elements(v_policies) AS j(p) LOOP
    EXECUTE format(
      'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s',
      v_pol.p ->> 'name', v_pol.p ->> 'schema', v_pol.p ->> 'table',
      v_pol.p ->> 'permissive', v_pol.p ->> 'cmd',
      (SELECT string_agg(CASE WHEN r = 'public' THEN 'PUBLIC' ELSE quote_ident(r) END, ', ')
         FROM jsonb_array_elements_text(v_pol.p -> 'roles') r),
      CASE WHEN v_pol.p ->> 'qual'  IS NOT NULL THEN ' USING (' || (v_pol.p ->> 'qual') || ')' ELSE '' END,
      CASE WHEN v_pol.p ->> 'check' IS NOT NULL THEN ' WITH CHECK (' || (v_pol.p ->> 'check') || ')' ELSE '' END);
  END LOOP;

  -- Échoue (donc annule tout) si quoi que ce soit dépend encore des anciens types.
  DROP TYPE public.role_utilisateur_ancien;
  DROP TYPE public.acces_document_ancien;

  -- ── mot_de_passe_hash (sans CASCADE : échoue si une vue ou une règle l'utilise) ──
  ALTER TABLE public.utilisateurs DROP COLUMN IF EXISTS mot_de_passe_hash;

  RAISE NOTICE '% vue(s) et % policy(ies) recréée(s) après changement des enums.', jsonb_array_length(v_vues), jsonb_array_length(v_policies);
END
$$;
