-- Règle : il ne peut pas y avoir de membre sans adhésion (sauf les administrateurs).
--
-- Un compte ne peut recevoir le rôle `membre`, à la création comme en modification, que s'il a une
-- adhésion en cours : statut `active` et `valable_jusqu_au` non dépassée. Valable pour tout le monde,
-- administrateurs compris : la seule porte d'entrée est valider_adhesion() (20261023000003), qui active
-- l'adhésion AVANT de changer le rôle, dans la même transaction.
--
-- Ce qui n'est PAS touché :
--   - les comptes déjà `membre` sans adhésion (aucune réécriture) : le contrôle ne porte que sur un
--     changement vers `membre`, pas sur les enregistrements qui laissent le rôle tel quel ;
--   - les administrateurs, qui n'ont pas besoin d'adhésion ;
--   - le retour à `inscrit` (échéance, expirer_adhesions()).

CREATE OR REPLACE FUNCTION private.exiger_adhesion_pour_membre()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NEW.role = 'membre'
     AND (TG_OP = 'INSERT' OR OLD.role IS DISTINCT FROM 'membre')
     AND NOT EXISTS (
       SELECT 1 FROM public.adhesions a
        WHERE a.utilisateur_id = NEW.id
          AND a.statut = 'active'
          AND a.valable_jusqu_au >= CURRENT_DATE
     )
  THEN
    RAISE EXCEPTION 'Le rôle Membre exige une adhésion en cours : saisissez puis validez son adhésion (Offre & adhésions).'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.exiger_adhesion_pour_membre() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_utilisateurs_membre_exige_adhesion ON public.utilisateurs;
CREATE TRIGGER trg_utilisateurs_membre_exige_adhesion
  BEFORE INSERT OR UPDATE OF role ON public.utilisateurs
  FOR EACH ROW EXECUTE FUNCTION private.exiger_adhesion_pour_membre();
