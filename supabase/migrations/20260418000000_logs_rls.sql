-- =====================================================
-- Sécurisation de la table logs (RLS)
-- =====================================================
-- La table logs existe déjà (créée dans 20260330000000_nouvelle_structure_bdd.sql).
-- On s'assure juste que les policies sont correctes :
-- - Les admins peuvent LIRE tous les logs
-- - Tout utilisateur authentifié peut INSÉRER un log sur lui-même (action tracée)
-- - Personne ne peut UPDATE ni DELETE (logs immuables)
-- =====================================================

ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Policies pour lecture admin
DROP POLICY IF EXISTS "logs_admin_lecture" ON logs;
CREATE POLICY "logs_admin_lecture"
  ON logs FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'administrateur'));

-- Insertion : chaque utilisateur connecté peut créer un log avec son propre id
DROP POLICY IF EXISTS "logs_insertion" ON logs;
DROP POLICY IF EXISTS "logs_insertion_soi" ON logs;
CREATE POLICY "logs_insertion_soi"
  ON logs FOR INSERT
  TO authenticated
  WITH CHECK (
    utilisateur_id = auth.uid()
    OR utilisateur_id IS NULL
  );

-- Rien de UPDATE/DELETE autorisé (pas de policy = tout est refusé)

-- Vue utilitaire : logs enrichis avec le nom de l'auteur
CREATE OR REPLACE VIEW vue_logs AS
SELECT
  l.id,
  l.utilisateur_id,
  COALESCE(u.prenom || ' ' || u.nom, '—') AS auteur,
  u.email                                 AS auteur_email,
  u.couleur_conges                        AS auteur_couleur,
  u.code_couleur_conges                   AS auteur_code_couleur,
  l.action,
  l.table_cible,
  l.enregistrement_cible_id,
  l.details,
  l.adresse_ip,
  l.user_agent,
  l.horodatage
FROM logs l
LEFT JOIN utilisateurs u ON u.id = l.utilisateur_id
ORDER BY l.horodatage DESC;

GRANT SELECT ON vue_logs TO authenticated;
