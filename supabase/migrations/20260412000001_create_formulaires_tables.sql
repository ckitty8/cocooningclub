-- =====================================================
-- Tables formulaires, form_fields et contact_messages
-- =====================================================
-- Structure nécessaire au form builder de l'admin
-- et au formulaire de contact dynamique du site public.
-- =====================================================

-- 1. Table formulaires
CREATE TABLE IF NOT EXISTS formulaires (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom         VARCHAR(100) NOT NULL,
  description TEXT,
  est_actif   BOOLEAN NOT NULL DEFAULT FALSE,
  cree_le     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  modifie_le  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE formulaires IS
  'Formulaires de contact configurables par l''admin. Le formulaire actif est celui affiché sur le site public.';

-- 2. Table form_fields
CREATE TABLE IF NOT EXISTS form_fields (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulaire_id UUID NOT NULL REFERENCES formulaires(id) ON DELETE CASCADE,
  label         VARCHAR(200) NOT NULL,
  field_type    VARCHAR(30) NOT NULL CHECK (field_type IN ('text', 'email', 'tel', 'textarea', 'select')),
  obligatoire   BOOLEAN NOT NULL DEFAULT FALSE,
  position      INTEGER NOT NULL DEFAULT 0,
  deletable     BOOLEAN NOT NULL DEFAULT TRUE,
  options       TEXT[],
  cree_le       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_fields_formulaire ON form_fields(formulaire_id);
CREATE INDEX IF NOT EXISTS idx_form_fields_position   ON form_fields(formulaire_id, position);

COMMENT ON TABLE form_fields IS
  'Champs d''un formulaire. options est utilisé uniquement pour field_type = select.';

-- 3. Table contact_messages
CREATE TABLE IF NOT EXISTS contact_messages (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email     VARCHAR(255),
  telephone VARCHAR(20),
  reponses  JSONB,
  lu        BOOLEAN NOT NULL DEFAULT FALSE,
  cree_le   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_cree_le ON contact_messages(cree_le DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_lu      ON contact_messages(lu) WHERE lu = FALSE;

COMMENT ON TABLE contact_messages IS
  'Messages envoyés via le formulaire de contact public.';

-- 4. Trigger de mise à jour automatique de modifie_le sur formulaires
DROP TRIGGER IF EXISTS trg_formulaires_modifie_le ON formulaires;
CREATE TRIGGER trg_formulaires_modifie_le
  BEFORE UPDATE ON formulaires
  FOR EACH ROW EXECUTE FUNCTION maj_modifie_le();

-- 5. RLS
ALTER TABLE formulaires      ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_fields      ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- FORMULAIRES : lecture publique (pour afficher le form sur le site), écriture admin
DROP POLICY IF EXISTS "formulaires_lecture_publique" ON formulaires;
CREATE POLICY "formulaires_lecture_publique"
  ON formulaires FOR SELECT
  TO anon, authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "formulaires_admin_all" ON formulaires;
CREATE POLICY "formulaires_admin_all"
  ON formulaires FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'administrateur'))
  WITH CHECK (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'administrateur'));

-- FORM_FIELDS : idem
DROP POLICY IF EXISTS "form_fields_lecture_publique" ON form_fields;
CREATE POLICY "form_fields_lecture_publique"
  ON form_fields FOR SELECT
  TO anon, authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "form_fields_admin_all" ON form_fields;
CREATE POLICY "form_fields_admin_all"
  ON form_fields FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'administrateur'))
  WITH CHECK (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'administrateur'));

-- CONTACT_MESSAGES : insertion publique (formulaire), lecture admin uniquement
DROP POLICY IF EXISTS "contact_messages_insert_public" ON contact_messages;
CREATE POLICY "contact_messages_insert_public"
  ON contact_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "contact_messages_admin_all" ON contact_messages;
CREATE POLICY "contact_messages_admin_all"
  ON contact_messages FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'administrateur'))
  WITH CHECK (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'administrateur'));

-- 6. Seed du formulaire par défaut
DO $$
DECLARE
  v_formulaire_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM formulaires WHERE est_actif = TRUE) THEN
    RAISE NOTICE 'Un formulaire actif existe déjà, aucune insertion faite.';
    RETURN;
  END IF;

  INSERT INTO formulaires (nom, description, est_actif)
  VALUES (
    'Contact site',
    'Formulaire de contact affiché dans la section "Envie de nous rejoindre ?" du site public.',
    TRUE
  )
  RETURNING id INTO v_formulaire_id;

  INSERT INTO form_fields (formulaire_id, label, field_type, obligatoire, position, deletable, options) VALUES
    (v_formulaire_id, 'Prénom',    'text',     TRUE,  1, TRUE, NULL),
    (v_formulaire_id, 'Nom',       'text',     TRUE,  2, TRUE, NULL),
    (v_formulaire_id, 'Email',     'email',    TRUE,  3, FALSE, NULL),
    (v_formulaire_id, 'Téléphone', 'tel',      FALSE, 4, TRUE, NULL),
    (v_formulaire_id, 'Message',   'textarea', TRUE,  5, TRUE, NULL);

  RAISE NOTICE 'Formulaire "Contact site" créé avec 5 champs.';
END $$;
