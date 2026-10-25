-- Mini-environnement façon production : public.is_admin() existe, pas private.is_admin().
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
END $$;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
CREATE TYPE role_utilisateur AS ENUM ('administrateur','inscrit','membre','membre_premium');
CREATE TABLE utilisateurs (id uuid PRIMARY KEY, email text, role role_utilisateur NOT NULL DEFAULT 'inscrit');
CREATE TABLE ateliers (id uuid PRIMARY KEY, titre text, date_fin_inscription date);
CREATE TABLE inscriptions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), atelier_id uuid NOT NULL, utilisateur_id uuid, email_invite text);
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
-- Le déclencheur tel qu'il est en production avant correctif.
CREATE SCHEMA private; GRANT USAGE ON SCHEMA private TO anon, authenticated;
CREATE FUNCTION public.bloquer_inscription_tardive() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE v_date_fin DATE;
BEGIN
  SELECT date_fin_inscription INTO v_date_fin FROM public.ateliers WHERE id = NEW.atelier_id;
  IF v_date_fin IS NOT NULL AND CURRENT_DATE > v_date_fin AND NOT private.is_admin() THEN
    RAISE EXCEPTION 'Les inscriptions à cet atelier sont closes depuis le %', v_date_fin USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_inscription_date_fin BEFORE INSERT ON inscriptions FOR EACH ROW EXECUTE FUNCTION bloquer_inscription_tardive();
INSERT INTO utilisateurs VALUES
 ('11111111-1111-1111-1111-111111111111','membre@x.fr','membre'),
 ('22222222-2222-2222-2222-222222222222','admin@x.fr','administrateur');
INSERT INTO ateliers VALUES
 ('aaaaaaaa-0000-0000-0000-000000000001','Ouvert', current_date + 5),
 ('aaaaaaaa-0000-0000-0000-000000000002','Clos', current_date - 1),
 ('aaaaaaaa-0000-0000-0000-000000000003','Sans date', NULL);
