-- =====================================================
-- Trigger : lier auth.users.id ↔ utilisateurs.id par email
-- =====================================================
-- Use case : un admin crée un membre dans /admin/membres avec le toggle
-- "Inactif" → on insère uniquement la ligne utilisateurs (UUID aléatoire),
-- pas de compte Supabase Auth. Plus tard, l'admin "active" le membre :
-- on appelle supabase.auth.signInWithOtp({ shouldCreateUser: true }) qui
-- crée le compte auth et envoie un magic link.
--
-- Sans ce trigger, le nouveau auth.users.id ne correspond pas à
-- utilisateurs.id : la policy utilisateurs_voir_soi (auth.uid() = id)
-- échoue, le membre ne peut pas charger son profil après login.
--
-- Le trigger ci-dessous se déclenche quand une ligne est ajoutée à
-- auth.users : il cherche une ligne utilisateurs avec le même email,
-- et met à jour son id pour qu'il pointe sur le nouvel auth.users.id.
-- Au passage, on garde est_actif tel quel (l'admin l'a déjà flippé à
-- true côté front avant d'envoyer le magic link).
-- =====================================================

CREATE OR REPLACE FUNCTION public.link_utilisateur_to_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- Si une ligne utilisateurs existe pour cet email avec un id différent,
  -- on la rebranche sur l'id du nouveau compte auth.
  UPDATE public.utilisateurs
  SET    id = NEW.id
  WHERE  email = NEW.email
    AND  id   <> NEW.id;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.link_utilisateur_to_auth() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_auth_user_created_link_utilisateur ON auth.users;
CREATE TRIGGER on_auth_user_created_link_utilisateur
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_utilisateur_to_auth();

COMMENT ON FUNCTION public.link_utilisateur_to_auth() IS
  'Sync : quand un compte Supabase Auth est créé (signUp / signInWithOtp avec shouldCreateUser), met à jour utilisateurs.id pour le faire correspondre, en se basant sur l''email. Permet d''activer un membre créé en mode "inactif" sans casser les RLS auth.uid() = id.';
