-- Mini-environnement façon Supabase
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
END $$;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
CREATE TYPE role_utilisateur AS ENUM ('administrateur','inscrit','membre','membre_premium');
CREATE TABLE utilisateurs (id uuid PRIMARY KEY, email varchar NOT NULL UNIQUE, prenom text, role role_utilisateur NOT NULL DEFAULT 'inscrit', est_actif bool NOT NULL DEFAULT true);
GRANT SELECT, INSERT, UPDATE, DELETE ON utilisateurs TO anon, authenticated;
ALTER TABLE utilisateurs ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$ SELECT EXISTS (SELECT 1 FROM public.utilisateurs WHERE id = auth.uid() AND role = 'administrateur') $$;
-- Policies reproduisant la prod (update self + admin sur tout)
CREATE POLICY utilisateurs_select_self ON utilisateurs FOR SELECT USING ((select auth.uid()) = id);
CREATE POLICY utilisateurs_update_self ON utilisateurs FOR UPDATE USING ((select auth.uid()) = id) WITH CHECK ((select auth.uid()) = id);
CREATE POLICY utilisateurs_admin ON utilisateurs FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
-- Données : le compte de la créatrice existe déjà comme administratrice
INSERT INTO utilisateurs (id, email, prenom, role) VALUES
 ('11111111-1111-1111-1111-111111111111','ChristelleLab@gmail.com','Christelle','administrateur'),
 ('22222222-2222-2222-2222-222222222222','admin@x.fr','Anne','administrateur'),
 ('33333333-3333-3333-3333-333333333333','membre@x.fr','Marie','membre');
