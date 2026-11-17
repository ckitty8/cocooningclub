-- =====================================================
-- Affichage public des ateliers (17/11)
-- =====================================================
-- Admin → Ateliers → « Affichage public » : les informations montrées au public (logo, description, date, lieu,
-- places, tarif, date limite, agenda, liens de partage…), une fois pour tous les ateliers, séparément pour l'accueil
-- et pour le calendrier. Une seule ligne ; NULL = réglage par défaut du site (affichage d'avant).
-- Lisible par tous (le site public en a besoin), modifiable par les administratrices seulement.
-- Les valeurs sont filtrées par le site (`src/lib/affichagePublic.ts`) : une valeur inconnue est ignorée.
-- Rejouable sans risque.

CREATE TABLE IF NOT EXISTS public.parametres_affichage_ateliers (
  id         BOOLEAN PRIMARY KEY DEFAULT true,
  accueil    TEXT[],
  calendrier TEXT[],
  modifie_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT parametres_affichage_ateliers_une_ligne CHECK (id),
  CONSTRAINT parametres_affichage_ateliers_taille CHECK (
    (accueil IS NULL OR cardinality(accueil) <= 20) AND (calendrier IS NULL OR cardinality(calendrier) <= 20)
  )
);

INSERT INTO public.parametres_affichage_ateliers (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.parametres_affichage_ateliers IS
  'Informations des ateliers affichées au public (accueil, calendrier) ; NULL = réglage par défaut du site.';

ALTER TABLE public.parametres_affichage_ateliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS parametres_affichage_ateliers_lecture ON public.parametres_affichage_ateliers;
CREATE POLICY parametres_affichage_ateliers_lecture ON public.parametres_affichage_ateliers
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS parametres_affichage_ateliers_admin ON public.parametres_affichage_ateliers;
CREATE POLICY parametres_affichage_ateliers_admin ON public.parametres_affichage_ateliers
  FOR UPDATE TO authenticated
  USING (private.utilisateur_est_admin()) WITH CHECK (private.utilisateur_est_admin());

REVOKE ALL ON public.parametres_affichage_ateliers FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.parametres_affichage_ateliers TO anon, authenticated;
GRANT UPDATE (accueil, calendrier, modifie_le) ON public.parametres_affichage_ateliers TO authenticated;
