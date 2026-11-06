-- Nouvel espace « Coworking » (06/11), compris dans les formules qui couvrent l'espace Business
-- (L'Espace Business et Chill + Business). Les ateliers de cet espace sont donc « inclus » pour ces
-- adhérentes (fonction atelier_inclus, inchangée : elle lit formule_espaces) et à payer pour les autres.
-- Rejouable sans risque : rien n'est créé deux fois.

INSERT INTO public.espaces (nom, slug)
SELECT 'Coworking', 'coworking'
WHERE NOT EXISTS (SELECT 1 FROM public.espaces WHERE slug = 'coworking' OR nom = 'Coworking');

-- Coworking s'affiche après les espaces existants (Papotages, Créatifs, Business).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'espaces' AND column_name = 'ordre_affichage') THEN
    EXECUTE $q$
      UPDATE public.espaces SET ordre_affichage = (SELECT COALESCE(max(ordre_affichage), 0) + 1 FROM public.espaces WHERE slug <> 'coworking')
      WHERE slug = 'coworking'
        AND ordre_affichage <= (SELECT COALESCE(max(ordre_affichage), 0) FROM public.espaces WHERE slug <> 'coworking')
    $q$;
  END IF;
END
$$;

INSERT INTO public.formule_espaces (formule_id, espace_id)
SELECT DISTINCT fe.formule_id, cw.id
FROM public.formule_espaces fe
JOIN public.espaces b ON b.id = fe.espace_id AND b.slug = 'business'
CROSS JOIN public.espaces cw
WHERE cw.slug = 'coworking'
  AND NOT EXISTS (
    SELECT 1 FROM public.formule_espaces x WHERE x.formule_id = fe.formule_id AND x.espace_id = cw.id
  );
