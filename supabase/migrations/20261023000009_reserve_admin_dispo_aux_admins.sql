-- La disponibilité des administratrices ne doit être lisible que par les administrateurs.
-- public.admin_dispo_le(date) n'est utilisée que par l'écran admin « Ateliers » mais restait appelable par
-- un visiteur via l'API (droit EXECUTE par défaut) : il pouvait savoir quels jours une administratrice est disponible.
-- Deux verrous : plus de droit d'exécution pour les visiteurs, et un contrôle administrateur dans la fonction.

CREATE OR REPLACE FUNCTION public.admin_dispo_le(p_date date)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_jour_semaine SMALLINT;
BEGIN
  IF NOT private.utilisateur_est_admin() THEN
    RAISE EXCEPTION 'Action réservée aux administrateurs' USING ERRCODE = '42501';
  END IF;
  v_jour_semaine := EXTRACT(DOW FROM p_date)::SMALLINT;
  RETURN EXISTS (
    SELECT 1 FROM utilisateurs u
    WHERE u.role = 'administrateur'
      AND EXISTS (SELECT 1 FROM disponibilites d WHERE d.utilisateur_id = u.id AND d.jour_semaine = v_jour_semaine)
      AND NOT EXISTS (SELECT 1 FROM indisponibilites i WHERE i.utilisateur_id = u.id AND p_date BETWEEN i.date_debut AND i.date_fin)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_dispo_le(date) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_dispo_le(date) TO authenticated;
