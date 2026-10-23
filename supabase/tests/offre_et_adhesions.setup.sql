-- Mini-environnement façon production pour 20261023000003_offre_et_adhesions.sql :
-- utilisateurs avec le trigger qui protège le rôle, antennes, helper admin.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
END $$;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
CREATE TYPE role_utilisateur AS ENUM ('administrateur','inscrit','membre','membre_premium');
CREATE TABLE utilisateurs (id uuid PRIMARY KEY, email text, role role_utilisateur NOT NULL DEFAULT 'inscrit', est_actif boolean NOT NULL DEFAULT true, debut_abonnement date, fin_abonnement date, cree_le timestamptz DEFAULT now());
CREATE TABLE antennes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nom text, slug text UNIQUE);
INSERT INTO antennes (nom, slug) VALUES ('Papotages','papotages'), ('Créatifs','creatifs'), ('Business','business');
CREATE FUNCTION public.maj_modifie_le() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.modifie_le = now(); RETURN NEW; END $$;
GRANT SELECT, UPDATE ON utilisateurs TO authenticated; GRANT SELECT ON antennes TO anon, authenticated;
ALTER TABLE utilisateurs ENABLE ROW LEVEL SECURITY;
CREATE POLICY u_all ON utilisateurs FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- Helper admin et trigger de protection comme en production (20261015000000).
CREATE SCHEMA private; GRANT USAGE ON SCHEMA private TO authenticated;
CREATE FUNCTION private.utilisateur_est_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.utilisateurs WHERE id = auth.uid() AND role = 'administrateur') $$;
REVOKE EXECUTE ON FUNCTION private.utilisateur_est_admin() FROM PUBLIC; GRANT EXECUTE ON FUNCTION private.utilisateur_est_admin() TO authenticated;
CREATE FUNCTION private.est_client_non_admin() RETURNS boolean LANGUAGE plpgsql STABLE SET search_path = '' AS $$
BEGIN
  IF current_user = 'anon' THEN RETURN TRUE;
  ELSIF current_user = 'authenticated' THEN RETURN NOT private.utilisateur_est_admin(); END IF;
  RETURN FALSE;
END $$;
GRANT EXECUTE ON FUNCTION private.est_client_non_admin() TO anon, authenticated;
CREATE FUNCTION private.proteger_utilisateurs() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_catalog AS $$
BEGIN
  IF NOT private.est_client_non_admin() THEN RETURN NEW; END IF;
  IF NEW.role IS DISTINCT FROM OLD.role OR NEW.debut_abonnement IS DISTINCT FROM OLD.debut_abonnement OR NEW.fin_abonnement IS DISTINCT FROM OLD.fin_abonnement THEN
    RAISE EXCEPTION 'Modification non autorisée' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_proteger_utilisateurs BEFORE UPDATE ON utilisateurs FOR EACH ROW EXECUTE FUNCTION private.proteger_utilisateurs();
INSERT INTO utilisateurs (id, email, role) VALUES
 ('11111111-1111-1111-1111-111111111111','insc@x.fr','inscrit'),
 ('22222222-2222-2222-2222-222222222222','admin@x.fr','administrateur'),
 ('33333333-3333-3333-3333-333333333333','ancien@x.fr','membre'),
 ('44444444-4444-4444-4444-444444444444','autre@x.fr','inscrit');
