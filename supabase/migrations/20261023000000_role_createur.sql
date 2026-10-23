-- =====================================================
-- Rôle « créateur » : réservé à christellelab@gmail.com
-- =====================================================
-- Le créateur est une administratrice (role = 'administrateur', donc tous les
-- droits d'administration déjà donnés par les policies RLS) qui dispose en plus
-- des outils du créateur dans le site : simulateur de rôle et matrice des rôles.
--
-- Il est porté par une colonne `est_createur` plutôt que par une nouvelle
-- valeur de l'enum role_utilisateur : une quinzaine de policies et de fonctions
-- testent en dur `role = 'administrateur'` et il faudrait toutes les réécrire
-- (et risquer d'en oublier une) pour que le créateur garde l'accès à l'admin.
--
-- Garanties, appliquées par la base quel que soit le client :
--   1. Seule l'adresse christellelab@gmail.com peut avoir est_createur = true
--      (contrainte CHECK, valable aussi pour le SQL editor).
--   2. Le créateur reste administratrice et active (contrainte CHECK).
--   3. Depuis le site (rôles anon / authenticated, y compris un administrateur),
--      personne ne peut attribuer ni retirer le statut de créateur, ni changer
--      le rôle, l'état actif ou l'email du compte créateur, ni le supprimer.
--      Ces changements se font uniquement depuis le SQL editor (postgres).
-- =====================================================

ALTER TABLE public.utilisateurs
  ADD COLUMN IF NOT EXISTS est_createur boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.utilisateurs.est_createur IS
  'Compte créateur du site (outils simulateur et matrice des rôles). Réservé à christellelab@gmail.com ; modifiable uniquement depuis le SQL editor.';

ALTER TABLE public.utilisateurs DROP CONSTRAINT IF EXISTS chk_utilisateurs_createur_email;
ALTER TABLE public.utilisateurs ADD CONSTRAINT chk_utilisateurs_createur_email
  CHECK (NOT est_createur OR lower(email) = 'christellelab@gmail.com');

ALTER TABLE public.utilisateurs DROP CONSTRAINT IF EXISTS chk_utilisateurs_createur_admin_actif;
ALTER TABLE public.utilisateurs ADD CONSTRAINT chk_utilisateurs_createur_admin_actif
  CHECK (NOT est_createur OR (role = 'administrateur' AND est_actif));


CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated;

-- SECURITY INVOKER : current_user doit rester le rôle de la requête
-- (anon / authenticated pour le site, postgres pour le SQL editor).
CREATE OR REPLACE FUNCTION private.proteger_createur()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.est_createur THEN
      RAISE EXCEPTION 'Le statut de créateur ne peut pas être attribué depuis le site.'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.est_createur THEN
      RAISE EXCEPTION 'Le compte créateur ne peut pas être supprimé depuis le site.'
        USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.est_createur IS DISTINCT FROM OLD.est_createur THEN
    RAISE EXCEPTION 'Le statut de créateur ne peut pas être modifié depuis le site.'
      USING ERRCODE = '42501';
  END IF;

  IF OLD.est_createur AND (
       NEW.role      IS DISTINCT FROM OLD.role
    OR NEW.est_actif IS DISTINCT FROM OLD.est_actif
    OR lower(NEW.email) IS DISTINCT FROM lower(OLD.email)
  ) THEN
    RAISE EXCEPTION 'Le rôle, l''état actif et l''email du compte créateur ne peuvent pas être modifiés depuis le site.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_createur ON public.utilisateurs;
CREATE TRIGGER trg_proteger_createur
  BEFORE INSERT OR UPDATE OR DELETE ON public.utilisateurs
  FOR EACH ROW EXECUTE FUNCTION private.proteger_createur();


-- Désigne le créateur (exécuté par le SQL editor, donc non bridé par le trigger).
-- Sans effet si le compte n'existe pas encore ou n'est pas administratrice active.
UPDATE public.utilisateurs
   SET est_createur = true
 WHERE lower(email) = 'christellelab@gmail.com'
   AND role = 'administrateur'
   AND est_actif;
