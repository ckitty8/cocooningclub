-- =====================================================
-- Correctif : les pré-inscriptions échouaient pour tout le monde
-- =====================================================
-- Le déclencheur trg_inscription_date_fin (fonction bloquer_inscription_tardive)
-- appelait private.is_admin(), qui n'existe pas en production (l'équivalent y est
-- public.is_admin(), et private.utilisateur_est_admin() depuis la migration
-- 20261015000000). Postgres résout les fonctions avant d'évaluer la condition :
-- dès qu'un atelier avait une date de fin d'inscription (c'est le cas de tous),
-- CHAQUE insertion (visiteur, membre ou administratrice) échouait avec
-- « function private.is_admin() does not exist » et le site affichait
-- « Une erreur est survenue ».
--
-- La fonction utilise désormais private.utilisateur_est_admin(), qui existe
-- partout où les migrations de sécurité ont été appliquées. Comportement
-- inchangé : une fois la date de fin passée, seuls les administrateurs peuvent
-- encore inscrire quelqu'un.
-- =====================================================

CREATE SCHEMA IF NOT EXISTS private;

-- Même définition que dans 20261015000000 (rejouable, nécessaire à ce correctif).
CREATE OR REPLACE FUNCTION private.utilisateur_est_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.utilisateurs
    WHERE id = auth.uid() AND role = 'administrateur'
  );
$$;

REVOKE EXECUTE ON FUNCTION private.utilisateur_est_admin() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION private.utilisateur_est_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.bloquer_inscription_tardive()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_date_fin DATE;
BEGIN
  SELECT date_fin_inscription INTO v_date_fin FROM public.ateliers WHERE id = NEW.atelier_id;
  IF v_date_fin IS NOT NULL AND CURRENT_DATE > v_date_fin AND NOT private.utilisateur_est_admin() THEN
    RAISE EXCEPTION 'Les inscriptions à cet atelier sont closes depuis le %', v_date_fin USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;
