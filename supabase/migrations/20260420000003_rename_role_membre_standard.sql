-- =====================================================
-- Renommage du rôle : membre_standard → membre
-- =====================================================
-- Renomme la valeur de l'enum role_utilisateur sans toucher aux données
-- existantes. Les lignes utilisateurs.role = 'membre_standard' deviennent
-- automatiquement 'membre' après le RENAME.
--
-- Les policies RLS qui comparent role à un littéral de l'ancien nom
-- doivent être recréées : on ne peut plus parser 'membre_standard' une
-- fois l'enum renommé.
-- =====================================================

-- 1. Drop les policies qui référencent l'ancien littéral
DROP POLICY IF EXISTS "documents_lecture_membre" ON documents;

-- 2. Renommer la valeur de l'enum (idempotent — ignore si déjà fait)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'role_utilisateur'
      AND e.enumlabel = 'membre_standard'
  ) THEN
    ALTER TYPE role_utilisateur RENAME VALUE 'membre_standard' TO 'membre';
  END IF;
END$$;

-- 3. Recréer la policy avec le nouveau nom
CREATE POLICY "documents_lecture_membre"
  ON documents FOR SELECT
  TO authenticated
  USING (
    acces IN ('tous', 'membres')
    AND EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'membre')
  );
