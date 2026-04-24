-- =====================================================
-- Convertir logs.action : ENUM → VARCHAR
-- =====================================================
-- Permet d'utiliser des clés d'action libres et d'utiliser
-- l'opérateur LIKE dans les requêtes de filtrage.
-- =====================================================

-- 1. Convertit la colonne (les valeurs existantes sont castées en text)
ALTER TABLE logs
  ALTER COLUMN action TYPE VARCHAR(100) USING action::text;

-- 2. Drop l'ancien type enum s'il n'est plus utilisé
DROP TYPE IF EXISTS type_action_log CASCADE;

-- 3. Recréer la vue vue_logs (CASCADE l'a supprimée)
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
