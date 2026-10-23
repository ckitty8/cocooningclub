-- Schéma minimal imitant la prod avant 20261023000000_nettoyage_premium_et_mot_de_passe_hash.sql :
-- enums avec les valeurs premium, policies variées qui en dépendent (sous-requêtes
-- sur utilisateurs.role, tables d'autres schémas, rôles et commandes différents).
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF; END $$;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
CREATE SCHEMA storage;
CREATE SCHEMA private;

CREATE TYPE role_utilisateur AS ENUM ('administrateur', 'inscrit', 'membre', 'membre_premium');
CREATE TYPE acces_document   AS ENUM ('membres', 'premium', 'tous');

CREATE TABLE utilisateurs (
  id uuid PRIMARY KEY, email text, role role_utilisateur NOT NULL DEFAULT 'inscrit',
  mot_de_passe_hash varchar(255)
);
CREATE INDEX idx_utilisateurs_role ON utilisateurs(role);
CREATE TABLE documents (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), titre text, acces acces_document NOT NULL DEFAULT 'membres');
CREATE TABLE ateliers (id uuid PRIMARY KEY, titre text);
CREATE TABLE avis (id uuid PRIMARY KEY, utilisateur_id uuid, note int);
CREATE TABLE storage.objects (id uuid PRIMARY KEY, bucket_id text);
CREATE VIEW vue_membres AS SELECT id, email FROM utilisateurs;   -- ne dépend pas de la colonne role

ALTER TABLE utilisateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ateliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE avis ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY utilisateurs_voir_soi ON utilisateurs FOR SELECT TO authenticated USING (auth.uid() = id);
-- Comme en prod (migration 20260429000000) : is_admin() en SECURITY DEFINER évite la récursion de RLS.
CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog
  AS $$ SELECT EXISTS (SELECT 1 FROM public.utilisateurs WHERE id = auth.uid() AND role = 'administrateur') $$;
CREATE POLICY utilisateurs_admin_tout ON utilisateurs FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY documents_lecture_membre ON documents FOR SELECT TO authenticated
  USING (acces IN ('tous', 'membres') AND EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'membre'));
CREATE POLICY documents_lecture_publique ON documents FOR SELECT TO anon, authenticated USING (acces = 'tous');
CREATE POLICY documents_admin ON documents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'administrateur'));
CREATE POLICY ateliers_admin ON ateliers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'administrateur'));
CREATE POLICY ateliers_lecture ON ateliers FOR SELECT USING (true);           -- sans dépendance : ne doit pas être touchée
CREATE POLICY avis_moderation ON avis AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role IN ('administrateur', 'membre')))
  WITH CHECK (true);
CREATE POLICY objets_admin ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'documents' AND EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'administrateur'));

GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON utilisateurs, documents, ateliers, avis TO authenticated;
GRANT SELECT ON documents, ateliers TO anon;

INSERT INTO utilisateurs (id, email, role) VALUES
  ('11111111-1111-1111-1111-111111111111', 'membre@x.fr', 'membre'),
  ('22222222-2222-2222-2222-222222222222', 'admin@x.fr', 'administrateur');
INSERT INTO documents (titre, acces) VALUES ('Guide', 'membres'), ('Flyer', 'tous');
