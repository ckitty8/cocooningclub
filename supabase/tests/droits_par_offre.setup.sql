-- Environnement pour 20261023000005_droits_par_offre.sql : on rejoue 000003 par-dessus
-- le mini-environnement de l'offre, avec des ateliers, des inscriptions et le déclencheur d'origine.
\i supabase/tests/offre_et_adhesions.setup.sql
\i supabase/migrations/20261023000003_offre_et_adhesions.sql
ALTER TABLE antennes ADD COLUMN IF NOT EXISTS ordre_affichage int;
CREATE TABLE ateliers (id uuid PRIMARY KEY, titre text, antenne_id uuid REFERENCES antennes(id), tarif_standard numeric);
CREATE TABLE inscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), atelier_id uuid NOT NULL, utilisateur_id uuid,
  statut text, statut_paiement text, present boolean, annule_le timestamptz, inscrit_le timestamptz);
GRANT SELECT, INSERT, UPDATE ON ateliers, inscriptions TO authenticated;
CREATE FUNCTION private.proteger_inscriptions() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_catalog AS $$
BEGIN RETURN NEW; END $$;  -- remplacée par la migration
CREATE TRIGGER trg_proteger_inscriptions BEFORE INSERT OR UPDATE ON inscriptions FOR EACH ROW EXECUTE FUNCTION private.proteger_inscriptions();
INSERT INTO ateliers (id, titre, antenne_id, tarif_standard)
SELECT g.id, g.titre, a.id, g.tarif FROM (VALUES
 ('a1111111-1111-1111-1111-111111111111'::uuid, 'Café des copines', 'papotages', 15::numeric),
 ('a2222222-2222-2222-2222-222222222222', 'Atelier floral',    'creatifs', 25),
 ('a3333333-3333-3333-3333-333333333333', 'Pitch en public',   'business', 25),
 ('a4444444-4444-4444-4444-444444444444', 'Atelier offert',    'business', 0),
 ('a5555555-5555-5555-5555-555555555555', 'Tarif inconnu',    'creatifs', NULL)
) g(id, titre, slug, tarif) JOIN antennes a ON a.slug = g.slug;

-- Journal et déclenchement de la migration 000006.
CREATE TABLE logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), utilisateur_id uuid, action varchar(100) NOT NULL, table_cible varchar(100), enregistrement_cible_id uuid, details jsonb, user_agent varchar(500), horodatage timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT ON logs TO authenticated;

-- Disponibilités des administratrices (migration 000009) : tables minimales et fonction d'origine.
CREATE TABLE disponibilites (utilisateur_id uuid, jour_semaine smallint);
CREATE TABLE indisponibilites (utilisateur_id uuid, date_debut date, date_fin date);
CREATE FUNCTION public.admin_dispo_le(p_date date) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT true $$;
INSERT INTO disponibilites VALUES ('22222222-2222-2222-2222-222222222222', EXTRACT(DOW FROM current_date)::smallint);
GRANT SELECT ON disponibilites, indisponibilites TO authenticated;
