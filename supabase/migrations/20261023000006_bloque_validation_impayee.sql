-- Blocage de la validation d'une pré-inscription non réglée.
--
-- (Le déclencheur s'appelle trg_verifier_… pour passer APRÈS trg_proteger_inscriptions, qui normalise d'abord les inscriptions des membres.)
--
-- Règle : une inscription ne peut passer (ou être créée) « confirmée » tant que son paiement est
-- « en_attente » (atelier à régler, ni payé ni non requis). Valable pour tout le monde, administrateurs
-- compris : la seule porte de sortie est la fonction valider_sans_paiement(), réservée aux
-- administrateurs, qui exige un motif et l'écrit dans le journal (logs / vue_logs).
--
-- Pour les inscriptions d'une personne qui a droit à l'atelier (gratuit ou inclus dans son adhésion),
-- le paiement est déjà « non_requis » (voir 20261023000005 et private.proteger_inscriptions) : aucun blocage.

CREATE OR REPLACE FUNCTION private.bloquer_validation_impayee()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NEW.statut = 'confirme'
     AND NEW.statut_paiement = 'en_attente'
     AND (TG_OP = 'INSERT' OR OLD.statut IS DISTINCT FROM 'confirme' OR OLD.statut_paiement IS DISTINCT FROM 'en_attente')
     AND COALESCE(current_setting('app.derogation_paiement', true), '') <> 'on'
  THEN
    RAISE EXCEPTION 'Paiement non réglé : enregistrez le règlement ou utilisez « Valider sans paiement ».'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.bloquer_validation_impayee() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_verifier_validation_impayee ON public.inscriptions;
CREATE TRIGGER trg_verifier_validation_impayee
  BEFORE INSERT OR UPDATE ON public.inscriptions
  FOR EACH ROW EXECUTE FUNCTION private.bloquer_validation_impayee();


-- Validation avec dérogation : administrateur uniquement, motif obligatoire, tracée dans le journal.
CREATE OR REPLACE FUNCTION public.valider_sans_paiement(p_inscription UUID, p_motif TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_ancien public.inscriptions%ROWTYPE;
BEGIN
  IF NOT private.utilisateur_est_admin() THEN
    RAISE EXCEPTION 'Action réservée aux administrateurs' USING ERRCODE = '42501';
  END IF;
  IF p_motif IS NULL OR length(btrim(p_motif)) < 3 THEN
    RAISE EXCEPTION 'Un motif est obligatoire' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_ancien FROM public.inscriptions WHERE id = p_inscription;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inscription introuvable' USING ERRCODE = 'P0002';
  END IF;

  PERFORM set_config('app.derogation_paiement', 'on', true);
  UPDATE public.inscriptions SET statut = 'confirme', annule_le = NULL WHERE id = p_inscription;
  PERFORM set_config('app.derogation_paiement', 'off', true);

  INSERT INTO public.logs (utilisateur_id, action, table_cible, enregistrement_cible_id, details)
  VALUES (auth.uid(), 'inscription.validate_sans_paiement', 'inscriptions', p_inscription,
          jsonb_build_object('motif', btrim(p_motif), 'statut_avant', v_ancien.statut::text,
                             'statut_paiement', v_ancien.statut_paiement::text));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.valider_sans_paiement(UUID, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.valider_sans_paiement(UUID, TEXT) TO authenticated;
