-- =====================================================
-- Bloquer les inscriptions après date_fin_inscription
-- =====================================================
-- Trigger BEFORE INSERT sur inscriptions :
--   - Si l'atelier a une date_fin_inscription dépassée → on lève une
--     exception, sauf si l'appelant est admin (peut ajouter une
--     inscription en retard depuis /admin/pre-inscriptions).
--   - Sinon laisse passer.
--
-- private.is_admin() est défini par 20260429000004 (security hardening).
-- =====================================================

CREATE OR REPLACE FUNCTION public.bloquer_inscription_tardive()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_date_fin DATE;
BEGIN
  SELECT date_fin_inscription INTO v_date_fin
  FROM public.ateliers WHERE id = NEW.atelier_id;

  IF v_date_fin IS NOT NULL
     AND CURRENT_DATE > v_date_fin
     AND NOT private.is_admin() THEN
    RAISE EXCEPTION 'Les inscriptions à cet atelier sont closes depuis le %', v_date_fin
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bloquer_inscription_tardive() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bloquer_inscription_tardive() FROM anon;
REVOKE EXECUTE ON FUNCTION public.bloquer_inscription_tardive() FROM authenticated;

DROP TRIGGER IF EXISTS trg_inscription_date_fin ON public.inscriptions;
CREATE TRIGGER trg_inscription_date_fin
  BEFORE INSERT ON public.inscriptions
  FOR EACH ROW EXECUTE FUNCTION public.bloquer_inscription_tardive();

COMMENT ON FUNCTION public.bloquer_inscription_tardive() IS
  'Empêche INSERT sur inscriptions si la date limite d''inscription de l''atelier est dépassée. Bypassée par les admins.';
