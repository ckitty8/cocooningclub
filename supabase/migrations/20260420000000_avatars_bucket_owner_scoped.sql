-- =====================================================
-- Correction : restreindre le bucket "avatars" au propriétaire du fichier
-- =====================================================
-- La migration précédente (20260419000000_avatars_bucket.sql) avait une
-- policy "FOR ALL TO authenticated" sans contrôle d'appartenance : n'importe
-- quel utilisateur connecté pouvait écraser / supprimer l'avatar d'un autre.
--
-- Convention de nommage côté frontend (src/pages/admin/MonCompte.tsx) :
--   path = "{auth.uid()}-{timestamp}.{ext}"
-- → on filtre sur le préfixe du nom de l'objet.
-- =====================================================

-- On remplace la policy fourre-tout
DROP POLICY IF EXISTS "avatars_authenticated_write" ON storage.objects;

-- INSERT : seul le propriétaire peut créer un avatar portant son préfixe
DROP POLICY IF EXISTS "avatars_owner_insert" ON storage.objects;
CREATE POLICY "avatars_owner_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND name LIKE auth.uid()::text || '-%'
  );

-- UPDATE (nécessaire pour upsert=true côté client) : limité à ses propres fichiers
DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
CREATE POLICY "avatars_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND name LIKE auth.uid()::text || '-%'
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND name LIKE auth.uid()::text || '-%'
  );

-- DELETE : limité à ses propres fichiers
DROP POLICY IF EXISTS "avatars_owner_delete" ON storage.objects;
CREATE POLICY "avatars_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND name LIKE auth.uid()::text || '-%'
  );

-- Les admins peuvent tout faire (modération)
DROP POLICY IF EXISTS "avatars_admin_all" ON storage.objects;
CREATE POLICY "avatars_admin_all"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'administrateur')
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'administrateur')
  );

-- La policy "avatars_public_read" existante reste inchangée (lecture publique).
