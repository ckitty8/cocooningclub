-- Renomme la valeur enum 'membre_standard' en 'membre'.
-- Les politiques RLS et données existantes sont mises à jour automatiquement
-- car PostgreSQL identifie les valeurs d'enum par oid en interne.

ALTER TYPE role_utilisateur RENAME VALUE 'membre_standard' TO 'membre';
