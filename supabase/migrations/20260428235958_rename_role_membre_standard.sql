-- Renomme la valeur enum 'membre_standard' en 'membre'.
-- Les politiques RLS et données existantes sont mises à jour automatiquement
-- car PostgreSQL identifie les valeurs d'enum par oid en interne.
--
-- Doublon de 20260420000003_rename_role_membre_standard.sql, qui fait déjà ce
-- renommage : rendu idempotent pour ne plus échouer sur une base reconstruite
-- depuis les migrations. Ce fichier portait la même version que
-- fix_rls_recursion_utilisateurs ; il a reçu une version unique, juste avant
-- (aucune dépendance entre les deux).

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
