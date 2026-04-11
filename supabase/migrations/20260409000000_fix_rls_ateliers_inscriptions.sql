-- =====================================================
-- Réactivation propre du RLS sur ateliers et inscriptions
-- =====================================================
-- Objectif :
--   - Lecture publique des ateliers publiés (anonymes inclus)
--   - Insertion d'inscriptions ouverte à tous (invités inclus)
--   - Tout le reste reste protégé
-- =====================================================

-- 1. Supprimer toutes les anciennes policies (au cas où)
DROP POLICY IF EXISTS "ateliers_lecture_publies" ON ateliers;
DROP POLICY IF EXISTS "ateliers_admin" ON ateliers;
DROP POLICY IF EXISTS "ateliers_select_public" ON ateliers;
DROP POLICY IF EXISTS "Allow public read" ON ateliers;
DROP POLICY IF EXISTS "Enable read access for all users" ON ateliers;

DROP POLICY IF EXISTS "inscriptions_voir_siennes" ON inscriptions;
DROP POLICY IF EXISTS "inscriptions_creer_invite" ON inscriptions;
DROP POLICY IF EXISTS "inscriptions_admin" ON inscriptions;
DROP POLICY IF EXISTS "Enable insert for all users" ON inscriptions;

-- 2. Réactiver RLS
ALTER TABLE ateliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscriptions ENABLE ROW LEVEL SECURITY;

-- 3. Policies ATELIERS
-- Lecture publique des ateliers publiés / complets / terminés
-- (anon ET authenticated)
CREATE POLICY "ateliers_select_public"
  ON ateliers
  FOR SELECT
  TO anon, authenticated
  USING (statut IN ('publie', 'complet', 'termine'));

-- Admins : tout
CREATE POLICY "ateliers_admin_all"
  ON ateliers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE u.id = auth.uid() AND u.role = 'administrateur'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE u.id = auth.uid() AND u.role = 'administrateur'
    )
  );

-- 4. Policies INSCRIPTIONS
-- Insertion ouverte à tous (invités inclus)
CREATE POLICY "inscriptions_insert_public"
  ON inscriptions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Lecture : ses propres inscriptions (utilisateur connecté)
CREATE POLICY "inscriptions_select_owner"
  ON inscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = utilisateur_id);

-- Admins : tout
CREATE POLICY "inscriptions_admin_all"
  ON inscriptions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE u.id = auth.uid() AND u.role = 'administrateur'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE u.id = auth.uid() AND u.role = 'administrateur'
    )
  );

-- 5. Vérification rapide (à exécuter manuellement après) :
-- SELECT id, titre, statut FROM ateliers WHERE statut IN ('publie', 'complet');
