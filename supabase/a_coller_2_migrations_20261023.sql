-- =====================================================================
-- À COLLER EN UNE FOIS dans le SQL Editor Supabase (projet CocooningClubBDD)
-- =====================================================================
-- Assemblage, dans l'ordre, des 5 migrations du 23/10/2026. Les fichiers
-- sources restent dans supabase/migrations/ ; ce fichier n'est qu'une commodité.
--
--   1. 20261023000000  enums sans « premium » + colonne mot_de_passe_hash
--   2. 20261023000001  purge RGPD planifiée + job de dépublication (pg_cron)
--   3. 20261023000002  date de naissance : colonne des comptes supprimée
--   4. 20261023000003  antennes -> espaces
--   5. 20261023000004  suppression des 2 tables de sauvegarde du 30/04
--
-- AVANT DE COLLER
--   * Déployer le site (cette branche) juste avant : les migrations 3 et 4
--     changent des noms que l'ancien code utilise encore (page admin Ateliers,
--     sauvegarde de « Mon compte »).
--   * Valider les durées de conservation (visites 13 mois, journal 12 mois,
--     contacts 3 ans, invités 3 ans, date de naissance 30 jours).
--
-- Si une étape échoue, le message dit pourquoi. Les étapes 1, 3, 4 et 5 sont
-- sans effet partiel (blocs gardés / sans CASCADE) ; en cas d'erreur, corriger
-- puis relancer le fichier entier : les étapes déjà passées se rejouent sans dégât.
-- Après exécution : Database > Extensions : vérifier que pg_cron est actif
-- (sinon l'activer et relancer l'étape 2, bloc DO final).
-- =====================================================================


-- ▶▶▶ ÉTAPE 1/5 — 20261023000000_nettoyage_premium_et_mot_de_passe_hash.sql
-- ---------------------------------------------------------------------
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


-- ▶▶▶ ÉTAPE 2/5 — 20261023000001_conservation_des_donnees.sql
-- ---------------------------------------------------------------------
-- =====================================================
-- Durées de conservation des données personnelles (RGPD)
-- =====================================================
-- Jusqu'ici seule private.envois_publics était purgée (48 h). Cette migration
-- ajoute une purge planifiée pour le reste :
--
--   visites_site        supprimées après 13 mois
--   logs (journal admin) supprimés après 12 mois
--   contact_messages    supprimés après 3 ans
--   inscriptions d'invités (sans compte) anonymisées 3 ans après l'atelier :
--     nom, prénom, email, téléphone et date de naissance sont effacés, la ligne
--     reste pour les statistiques (présence, paiement, places).
--
-- Non concernés : les comptes membres (supprimés à la demande), et
-- transactions_paypal (conservées pour la comptabilité).
--
-- Les durées sont les constantes de la fonction ci-dessous : pour les changer,
-- republier la fonction, puis mettre à jour src/pages/Confidentialite.tsx.
--
-- La fonction n'est appelable ni par anon ni par authenticated : elle n'est
-- lancée que par pg_cron (rôle postgres) ou à la main depuis le SQL Editor.
-- Les triggers de protection laissent passer ces rôles (cf.
-- private.est_client_non_admin).
-- =====================================================

CREATE OR REPLACE FUNCTION private.purger_donnees_anciennes()
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  c_visites   CONSTANT INTERVAL := INTERVAL '13 months';
  c_journal   CONSTANT INTERVAL := INTERVAL '12 months';
  c_contacts  CONSTANT INTERVAL := INTERVAL '3 years';
  c_invites   CONSTANT INTERVAL := INTERVAL '3 years';
  n_visites   INT;
  n_journal   INT;
  n_contacts  INT;
  n_invites   INT;
BEGIN
  DELETE FROM public.visites_site WHERE cree_le < now() - c_visites;
  GET DIAGNOSTICS n_visites = ROW_COUNT;

  DELETE FROM public.logs WHERE horodatage < now() - c_journal;
  GET DIAGNOSTICS n_journal = ROW_COUNT;

  DELETE FROM public.contact_messages WHERE cree_le < now() - c_contacts;
  GET DIAGNOSTICS n_contacts = ROW_COUNT;

  -- La contrainte chk_participant impose un nom, un prénom et un email aux
  -- invités : on met des valeurs neutres. L'email reste unique par ligne pour
  -- ne pas déclencher la détection de doublons.
  UPDATE public.inscriptions i
  SET    nom_invite       = 'Anonymisé',
         prenom_invite    = 'Anonymisé',
         email_invite     = 'anonyme-' || i.id || '@anonyme.invalid',
         telephone_invite = NULL,
         date_naissance   = NULL
  FROM   public.ateliers a
  WHERE  a.id = i.atelier_id
    AND  i.utilisateur_id IS NULL
    AND  a.date_atelier < current_date - c_invites
    AND  i.email_invite NOT LIKE '%@anonyme.invalid';
  GET DIAGNOSTICS n_invites = ROW_COUNT;

  RETURN jsonb_build_object(
    'visites_supprimees',       n_visites,
    'journal_supprime',         n_journal,
    'messages_supprimes',       n_contacts,
    'invites_anonymises',       n_invites
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION private.purger_donnees_anciennes() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION private.purger_donnees_anciennes() IS
  'Purge RGPD : visites 13 mois, journal 12 mois, messages de contact 3 ans, invités anonymisés 3 ans après l''atelier. Renvoie le nombre de lignes traitées.';

-- Planification quotidienne (03:30 UTC) si pg_cron est disponible. On tente de
-- l'activer ; si ce n'est pas possible depuis la migration, activer
-- l'extension pg_cron dans Supabase (Database > Extensions) puis relancer ce bloc.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      CREATE EXTENSION IF NOT EXISTS pg_cron;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'pg_cron indisponible (%) : la purge n''est PAS planifiée.', SQLERRM;
    END;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'purger_donnees_anciennes_daily';
    PERFORM cron.schedule(
      'purger_donnees_anciennes_daily',
      '30 3 * * *',
      $cron$SELECT private.purger_donnees_anciennes();$cron$
    );

    -- Constaté en prod le 23/10/2026 : pg_cron n'était pas installé, donc le job
    -- de 20260411000000 (passage des ateliers passés à « terminé ») n'a jamais
    -- été planifié ; seule la page admin Ateliers le faisait à l'ouverture.
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'depublier_ateliers_passes_daily';
    PERFORM cron.schedule(
      'depublier_ateliers_passes_daily',
      '0 3 * * *',
      $cron$SELECT public.depublier_ateliers_passes();$cron$
    );
  END IF;
END $$;


-- ▶▶▶ ÉTAPE 3/5 — 20261023000002_minimisation_date_naissance.sql
-- ---------------------------------------------------------------------
-- =====================================================
-- Minimisation de la date de naissance
-- =====================================================
-- La date de naissance n'est utile que pour un atelier (thème astrologique) et
-- est saisie sur la pré-inscription. La copie stockée sur le compte
-- (utilisateurs.date_naissance) n'était lue par aucune fonctionnalité :
--
--   1. supprime utilisateurs.date_naissance (sans CASCADE : échoue si une vue
--      ou une règle l'utilise encore) ;
--   2. la purge RGPD efface désormais inscriptions.date_naissance 30 jours
--      après la date de l'atelier, pour les membres comme pour les invités.
--
-- Remplace private.purger_donnees_anciennes() de 20261023000001 par une
-- version identique + l'étape 2.
-- =====================================================

ALTER TABLE public.utilisateurs DROP COLUMN IF EXISTS date_naissance;

CREATE OR REPLACE FUNCTION private.purger_donnees_anciennes()
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  c_visites    CONSTANT INTERVAL := INTERVAL '13 months';
  c_journal    CONSTANT INTERVAL := INTERVAL '12 months';
  c_contacts   CONSTANT INTERVAL := INTERVAL '3 years';
  c_invites    CONSTANT INTERVAL := INTERVAL '3 years';
  c_naissance  CONSTANT INTERVAL := INTERVAL '30 days';
  n_visites    INT;
  n_journal    INT;
  n_contacts   INT;
  n_invites    INT;
  n_naissance  INT;
BEGIN
  DELETE FROM public.visites_site WHERE cree_le < now() - c_visites;
  GET DIAGNOSTICS n_visites = ROW_COUNT;

  DELETE FROM public.logs WHERE horodatage < now() - c_journal;
  GET DIAGNOSTICS n_journal = ROW_COUNT;

  DELETE FROM public.contact_messages WHERE cree_le < now() - c_contacts;
  GET DIAGNOSTICS n_contacts = ROW_COUNT;

  -- Date de naissance : effacée peu après l'atelier (membres et invités).
  -- Doit passer avant l'anonymisation, qui l'efface aussi pour les anciens invités.
  UPDATE public.inscriptions i
  SET    date_naissance = NULL
  FROM   public.ateliers a
  WHERE  a.id = i.atelier_id
    AND  i.date_naissance IS NOT NULL
    AND  a.date_atelier < current_date - c_naissance;
  GET DIAGNOSTICS n_naissance = ROW_COUNT;

  -- La contrainte chk_participant impose un nom, un prénom et un email aux
  -- invités : on met des valeurs neutres. L'email reste unique par ligne pour
  -- ne pas déclencher la détection de doublons.
  UPDATE public.inscriptions i
  SET    nom_invite       = 'Anonymisé',
         prenom_invite    = 'Anonymisé',
         email_invite     = 'anonyme-' || i.id || '@anonyme.invalid',
         telephone_invite = NULL,
         date_naissance   = NULL
  FROM   public.ateliers a
  WHERE  a.id = i.atelier_id
    AND  i.utilisateur_id IS NULL
    AND  a.date_atelier < current_date - c_invites
    AND  i.email_invite NOT LIKE '%@anonyme.invalid';
  GET DIAGNOSTICS n_invites = ROW_COUNT;

  RETURN jsonb_build_object(
    'visites_supprimees',       n_visites,
    'journal_supprime',         n_journal,
    'messages_supprimes',       n_contacts,
    'dates_naissance_effacees', n_naissance,
    'invites_anonymises',       n_invites
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION private.purger_donnees_anciennes() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION private.purger_donnees_anciennes() IS
  'Purge RGPD : visites 13 mois, journal 12 mois, messages de contact 3 ans, dates de naissance 30 jours après l''atelier, invités anonymisés 3 ans après l''atelier. Renvoie le nombre de lignes traitées.';


-- ▶▶▶ ÉTAPE 4/5 — 20261023000003_renomme_antennes_en_espaces.sql
-- ---------------------------------------------------------------------
-- =====================================================
-- Renommage « antennes » -> « espaces »
-- =====================================================
-- Le site et l'admin parlent d'« espaces » (Papotages, Créatifs, Business)
-- depuis le commit « antennes devient espaces » ; la base disait encore
-- « antennes » (migration 20260429000017). Cette migration aligne la base :
--
--   table antennes            -> espaces
--   ateliers.antenne_id       -> espace_id (et sa clé étrangère)
--   policies antennes_*       -> espaces_*
--   index et contraintes      -> noms alignés
--   vues : colonnes antenne / antenne_slug -> espace / espace_slug
--
-- Seule la page admin « Ateliers » lit ces noms : à déployer avec le site
-- (versions du code postérieures au commit qui accompagne cette migration).
-- Les types Realtime, les droits (GRANT) et les données suivent le renommage.
-- Chaque étape est gardée : rejouer la migration ne casse rien.
-- =====================================================

DO $$
BEGIN
  IF to_regclass('public.antennes') IS NOT NULL THEN
    ALTER TABLE public.antennes RENAME TO espaces;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'ateliers' AND column_name = 'antenne_id') THEN
    ALTER TABLE public.ateliers RENAME COLUMN antenne_id TO espace_id;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ateliers_antenne_id_fkey') THEN
    ALTER TABLE public.ateliers RENAME CONSTRAINT ateliers_antenne_id_fkey TO ateliers_espace_id_fkey;
  END IF;

  -- Clés primaire / uniques créées sous l'ancien nom « categories ».
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_pkey' AND conrelid = 'public.espaces'::regclass) THEN
    ALTER TABLE public.espaces RENAME CONSTRAINT categories_pkey TO espaces_pkey;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_nom_key' AND conrelid = 'public.espaces'::regclass) THEN
    ALTER TABLE public.espaces RENAME CONSTRAINT categories_nom_key TO espaces_nom_key;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_slug_key' AND conrelid = 'public.espaces'::regclass) THEN
    ALTER TABLE public.espaces RENAME CONSTRAINT categories_slug_key TO espaces_slug_key;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'espaces' AND policyname = 'antennes_admin') THEN
    ALTER POLICY "antennes_admin" ON public.espaces RENAME TO "espaces_admin";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'espaces' AND policyname = 'antennes_lecture') THEN
    ALTER POLICY "antennes_lecture" ON public.espaces RENAME TO "espaces_lecture";
  END IF;

  IF to_regclass('public.idx_categories_ordre') IS NOT NULL THEN
    ALTER INDEX public.idx_categories_ordre RENAME TO idx_espaces_ordre;
  END IF;
  IF to_regclass('public.idx_ateliers_categorie') IS NOT NULL THEN
    ALTER INDEX public.idx_ateliers_categorie RENAME TO idx_ateliers_espace;
  END IF;

  -- Colonnes exposées par les vues.
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'vue_prochains_ateliers' AND column_name = 'antenne') THEN
    ALTER VIEW public.vue_prochains_ateliers RENAME COLUMN antenne TO espace;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'vue_prochains_ateliers' AND column_name = 'antenne_slug') THEN
    ALTER VIEW public.vue_prochains_ateliers RENAME COLUMN antenne_slug TO espace_slug;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'vue_avis_publies' AND column_name = 'antenne') THEN
    ALTER VIEW public.vue_avis_publies RENAME COLUMN antenne TO espace;
  END IF;
END
$$;


-- ▶▶▶ ÉTAPE 5/5 — 20261023000004_supprime_tables_sauvegarde.sql
-- ---------------------------------------------------------------------
-- =====================================================
-- Suppression des deux tables de sauvegarde du 30/04/2026
-- =====================================================
-- Copies ponctuelles faites avant le rattrapage des inscriptions
-- (20260429000008) : inscriptions_backup_20260430 (6 inscriptions de membres,
-- avril 2026) et transactions_paypal_backup_20260430 (vide).
--
-- Vérifié en prod le 23/10/2026 : aucune vue, clé étrangère ni ligne de code
-- n'y fait référence ; RLS activé sans policy mais droits complets accordés à
-- anon et authenticated. Ce sont des doublons de données personnelles sans
-- usage : on les supprime. Pas de CASCADE : toute dépendance inattendue fait
-- échouer la migration.
-- =====================================================

DROP TABLE IF EXISTS public.inscriptions_backup_20260430;
DROP TABLE IF EXISTS public.transactions_paypal_backup_20260430;
