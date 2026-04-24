-- =====================================================
-- Boîte à idées (admins uniquement)
-- =====================================================

-- 1. Enums
DROP TYPE IF EXISTS categorie_idee CASCADE;
CREATE TYPE categorie_idee AS ENUM (
  'evolution_site',
  'ateliers',
  'anomalie_site',
  'membres',
  'communication',
  'evenements',
  'organisation',
  'autre'
);

DROP TYPE IF EXISTS reaction_idee CASCADE;
CREATE TYPE reaction_idee AS ENUM (
  'valide',
  'non_valide',
  'a_discuter'
);

-- 2. Table idees
CREATE TABLE IF NOT EXISTS idees (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  categorie      categorie_idee NOT NULL DEFAULT 'autre',
  titre          VARCHAR(200) NOT NULL,
  description    TEXT,
  cree_le        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  modifie_le     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_idees_utilisateur ON idees(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_idees_categorie ON idees(categorie);
CREATE INDEX IF NOT EXISTS idx_idees_cree_le ON idees(cree_le DESC);

-- Trigger modifie_le
DROP TRIGGER IF EXISTS trg_idees_modifie_le ON idees;
CREATE TRIGGER trg_idees_modifie_le
  BEFORE UPDATE ON idees
  FOR EACH ROW EXECUTE FUNCTION maj_modifie_le();

COMMENT ON TABLE idees IS 'Boîte à idées admin. Chaque admin peut proposer des idées classées par catégorie.';

-- 3. Table idee_reactions
CREATE TABLE IF NOT EXISTS idee_reactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idee_id        UUID NOT NULL REFERENCES idees(id) ON DELETE CASCADE,
  utilisateur_id UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  reaction       reaction_idee NOT NULL,
  cree_le        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(idee_id, utilisateur_id)
);

CREATE INDEX IF NOT EXISTS idx_reactions_idee ON idee_reactions(idee_id);
CREATE INDEX IF NOT EXISTS idx_reactions_utilisateur ON idee_reactions(utilisateur_id);

COMMENT ON TABLE idee_reactions IS 'Réactions des admins sur les idées. Un admin = une seule réaction par idée.';

-- 4. RLS (admins uniquement)
ALTER TABLE idees          ENABLE ROW LEVEL SECURITY;
ALTER TABLE idee_reactions ENABLE ROW LEVEL SECURITY;

-- IDEES : lecture par tout admin, écriture par l'auteur ou admin
DROP POLICY IF EXISTS "idees_admin_lecture" ON idees;
CREATE POLICY "idees_admin_lecture"
  ON idees FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'administrateur'));

DROP POLICY IF EXISTS "idees_admin_ecriture" ON idees;
CREATE POLICY "idees_admin_ecriture"
  ON idees FOR INSERT
  TO authenticated
  WITH CHECK (
    utilisateur_id = auth.uid()
    AND EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'administrateur')
  );

DROP POLICY IF EXISTS "idees_auteur_modif" ON idees;
CREATE POLICY "idees_auteur_modif"
  ON idees FOR UPDATE
  TO authenticated
  USING (utilisateur_id = auth.uid())
  WITH CHECK (utilisateur_id = auth.uid());

DROP POLICY IF EXISTS "idees_auteur_delete" ON idees;
CREATE POLICY "idees_auteur_delete"
  ON idees FOR DELETE
  TO authenticated
  USING (utilisateur_id = auth.uid());

-- REACTIONS : lecture par tout admin, écriture par soi-même
DROP POLICY IF EXISTS "reactions_admin_lecture" ON idee_reactions;
CREATE POLICY "reactions_admin_lecture"
  ON idee_reactions FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'administrateur'));

DROP POLICY IF EXISTS "reactions_soi_crud" ON idee_reactions;
CREATE POLICY "reactions_soi_crud"
  ON idee_reactions FOR ALL
  TO authenticated
  USING (utilisateur_id = auth.uid())
  WITH CHECK (
    utilisateur_id = auth.uid()
    AND EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'administrateur')
  );
