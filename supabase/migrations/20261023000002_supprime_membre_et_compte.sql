-- Suppression d'un membre depuis l'espace admin : supprime aussi son compte de
-- connexion (auth.users). Avant, seule la ligne public.utilisateurs partait et
-- la personne pouvait toujours se connecter.
--
-- Réservé aux administrateurs actifs ; on ne peut pas se supprimer soi-même.
-- Utilise private.utilisateur_est_admin() (et non private.is_admin(), absent en prod).

CREATE OR REPLACE FUNCTION public.supprimer_membre(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT private.utilisateur_est_admin() THEN
    RAISE EXCEPTION 'Action réservée aux administrateurs' USING ERRCODE = '42501';
  END IF;
  IF p_id = auth.uid() THEN
    RAISE EXCEPTION 'Vous ne pouvez pas supprimer votre propre compte' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.utilisateurs WHERE id = p_id;
  DELETE FROM auth.users WHERE id = p_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.supprimer_membre(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.supprimer_membre(uuid) TO authenticated;
