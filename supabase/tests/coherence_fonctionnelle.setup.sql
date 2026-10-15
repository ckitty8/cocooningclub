-- Complète les deux setups précédents avec ce dont dépend la migration
-- 20261016000000_coherence_fonctionnelle.sql (état de la prod au 16/10/2026).
ALTER TABLE ateliers ADD COLUMN IF NOT EXISTS places_max INT DEFAULT 10;
CREATE TYPE type_action_log AS ENUM ('connexion', 'autre');
CREATE TABLE logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), utilisateur_id uuid, action type_action_log NOT NULL, table_cible text, enregistrement_cible_id uuid, details jsonb, adresse_ip text, user_agent text, horodatage timestamptz NOT NULL DEFAULT now());
ALTER TABLE utilisateurs ADD COLUMN couleur_conges text, ADD COLUMN code_couleur_conges text;
CREATE VIEW vue_logs WITH (security_invoker = on) AS SELECT l.action FROM logs l;
CREATE VIEW vue_avis_publies WITH (security_invoker = true) AS SELECT av.id FROM avis av;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
GRANT INSERT, SELECT ON logs TO authenticated;
CREATE POLICY logs_insertion_soi ON logs FOR INSERT TO authenticated WITH CHECK (utilisateur_id = auth.uid() OR utilisateur_id IS NULL);
-- Ancienne version (SECURITY INVOKER) du trigger de places, comme en prod.
CREATE FUNCTION public.decrementer_places() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.statut = 'confirme' AND (OLD IS NULL OR OLD.statut != 'confirme') THEN
    UPDATE ateliers SET places_disponibles = places_disponibles - 1 WHERE id = NEW.atelier_id AND places_disponibles > 0;
  END IF;
  IF OLD IS NOT NULL AND OLD.statut = 'confirme' AND NEW.statut IN ('annule', 'en_attente') THEN
    UPDATE ateliers SET places_disponibles = places_disponibles + 1 WHERE id = NEW.atelier_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_inscription_places AFTER INSERT OR UPDATE ON inscriptions FOR EACH ROW EXECUTE FUNCTION decrementer_places();
CREATE POLICY ateliers_admin ON ateliers FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
-- Un avis mis en avant écrit par un membre, un autre saisi par l'admin.
INSERT INTO avis (utilisateur_id, inscription_id, note, commentaire, moderation, mis_en_avant)
  VALUES ('33333333-3333-3333-3333-333333333333', 'bbbbbbbb-0000-0000-0000-000000000003', 5, 'Super atelier', 'approuve', true);
