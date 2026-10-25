-- =====================================================
-- Pré-inscription : droit à l'image et groupe WhatsApp
-- =====================================================
-- Le formulaire de pré-inscription demande désormais deux réponses explicites (J'autorise / Je n'autorise pas,
-- J'accepte / Je n'accepte pas) :
--   * autorisation_image : photos et vidéos prises pendant l'atelier ;
--   * accord_whatsapp    : ajout au groupe WhatsApp du club.
-- NULL = pas de réponse (pré-inscriptions faites avant cette date, ou saisies par l'équipe).
-- La date du consentement est posée par la base (jamais par le navigateur) pour servir de preuve.
-- Le nom et le prénom étaient déjà deux colonnes distinctes (nom_invite, prenom_invite) : rien à changer.
-- Ce droit à l'image est propre à l'atelier : il ne remplace pas l'autorisation du bulletin d'adhésion
-- (table adhesions, vue vue_autorisation_image).

ALTER TABLE public.inscriptions
  ADD COLUMN IF NOT EXISTS autorisation_image BOOLEAN,
  ADD COLUMN IF NOT EXISTS accord_whatsapp    BOOLEAN,
  ADD COLUMN IF NOT EXISTS consentements_le   TIMESTAMPTZ;

COMMENT ON COLUMN public.inscriptions.autorisation_image IS
  'Droit à l''image donné à la pré-inscription : true = autorise, false = n''autorise pas, NULL = pas de réponse.';
COMMENT ON COLUMN public.inscriptions.accord_whatsapp IS
  'Accord pour l''ajout au groupe WhatsApp du club : true = accepte, false = n''accepte pas, NULL = pas de réponse.';

CREATE OR REPLACE FUNCTION private.dater_consentements_inscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF private.est_client_non_admin() THEN
    NEW.consentements_le := CASE
      WHEN NEW.autorisation_image IS NOT NULL OR NEW.accord_whatsapp IS NOT NULL THEN now()
      ELSE NULL
    END;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.dater_consentements_inscription() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_dater_consentements_inscription ON public.inscriptions;
CREATE TRIGGER trg_dater_consentements_inscription
  BEFORE INSERT ON public.inscriptions
  FOR EACH ROW EXECUTE FUNCTION private.dater_consentements_inscription();
