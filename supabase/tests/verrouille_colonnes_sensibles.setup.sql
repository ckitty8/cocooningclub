-- Mini-environnement façon Supabase
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
END $$;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
CREATE TYPE role_utilisateur AS ENUM ('inscrit','membre','administrateur');
CREATE TYPE statut_inscription AS ENUM ('en_attente','confirme','annule');
CREATE TYPE statut_paiement AS ENUM ('en_attente','paye','non_requis');
CREATE TYPE statut_moderation AS ENUM ('en_attente','approuve','rejete');
CREATE TABLE utilisateurs (id uuid PRIMARY KEY, email text, prenom text, nom text, telephone text, role role_utilisateur NOT NULL DEFAULT 'inscrit', url_avatar text, debut_abonnement date, fin_abonnement date, est_actif bool NOT NULL DEFAULT true, cree_le timestamptz NOT NULL DEFAULT now(), modifie_le timestamptz NOT NULL DEFAULT now());
CREATE TABLE ateliers (id uuid PRIMARY KEY, titre text, statut text, tarif_standard numeric, places_disponibles int);
CREATE TABLE inscriptions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), atelier_id uuid, utilisateur_id uuid, nom_invite text, prenom_invite text, email_invite text, telephone_invite text, date_naissance date, statut statut_inscription NOT NULL DEFAULT 'en_attente', statut_paiement statut_paiement NOT NULL DEFAULT 'en_attente', present bool NOT NULL DEFAULT false, inscrit_le timestamptz NOT NULL DEFAULT now(), annule_le timestamptz);
CREATE TABLE avis (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), utilisateur_id uuid NOT NULL, inscription_id uuid NOT NULL UNIQUE, note int, commentaire text, moderation statut_moderation NOT NULL DEFAULT 'en_attente', mis_en_avant bool NOT NULL DEFAULT false, cree_le timestamptz NOT NULL DEFAULT now(), modere_le timestamptz, nom_auteur text);
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
ALTER TABLE utilisateurs ENABLE ROW LEVEL SECURITY; ALTER TABLE ateliers ENABLE ROW LEVEL SECURITY; ALTER TABLE inscriptions ENABLE ROW LEVEL SECURITY; ALTER TABLE avis ENABLE ROW LEVEL SECURITY;
-- Comme en prod : is_admin() dans public, pas de schéma private au départ.
CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$ SELECT EXISTS (SELECT 1 FROM public.utilisateurs WHERE id = auth.uid() AND role = 'administrateur') $$;
-- Policies reproduisant la prod
CREATE POLICY utilisateurs_select_self ON utilisateurs FOR SELECT USING ((select auth.uid()) = id);
CREATE POLICY utilisateurs_update_self ON utilisateurs FOR UPDATE USING ((select auth.uid()) = id) WITH CHECK ((select auth.uid()) = id);
CREATE POLICY utilisateurs_admin ON utilisateurs FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY ateliers_select_public ON ateliers FOR SELECT TO anon, authenticated USING (statut IN ('publie','complet','termine'));
CREATE POLICY inscriptions_insert_public ON inscriptions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY inscriptions_select_owner ON inscriptions FOR SELECT TO authenticated USING (auth.uid() = utilisateur_id);
CREATE POLICY inscriptions_update_owner ON inscriptions FOR UPDATE TO authenticated USING (auth.uid() = utilisateur_id) WITH CHECK (auth.uid() = utilisateur_id);
CREATE POLICY inscriptions_admin ON inscriptions FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY avis_creer ON avis FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = utilisateur_id);
CREATE POLICY avis_admin ON avis FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
-- Données
INSERT INTO utilisateurs (id, email, prenom, nom, role) VALUES
 ('11111111-1111-1111-1111-111111111111','membre@x.fr','Marie','Membre','membre'),
 ('22222222-2222-2222-2222-222222222222','admin@x.fr','Anne','Admin','administrateur'),
 ('33333333-3333-3333-3333-333333333333','autre@x.fr','Zoé','Autre','membre');
INSERT INTO ateliers VALUES ('aaaaaaaa-0000-0000-0000-000000000001','Payant','publie',25,10),('aaaaaaaa-0000-0000-0000-000000000002','Gratuit','publie',0,10);
INSERT INTO inscriptions (id, atelier_id, utilisateur_id, statut, statut_paiement, present) VALUES
 ('bbbbbbbb-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','confirme','en_attente',false),
 ('bbbbbbbb-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','confirme','paye',true),
 ('bbbbbbbb-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333','confirme','paye',true);
