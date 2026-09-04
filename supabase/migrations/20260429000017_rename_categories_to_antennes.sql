-- =====================================================
-- Renommage "catégories" -> "antennes"
-- =====================================================
-- Le club ne parle plus d'"univers"/"catégories" mais d'"antennes"
-- (Papotages, Créatifs, Business). Renommage complet côté BDD :
-- table, colonne FK, contrainte FK et policies RLS. La table était
-- vide de toute référence (0 atelier ne référence encore de
-- catégorie), le renommage est donc sans risque de données.
-- =====================================================

ALTER TABLE public.categories RENAME TO antennes;
ALTER TABLE public.ateliers RENAME COLUMN categorie_id TO antenne_id;
ALTER TABLE public.ateliers RENAME CONSTRAINT ateliers_categorie_id_fkey TO ateliers_antenne_id_fkey;

ALTER POLICY "categories_admin"   ON public.antennes RENAME TO "antennes_admin";
ALTER POLICY "categories_lecture" ON public.antennes RENAME TO "antennes_lecture";

-- Recalage du contenu sur les 3 antennes officielles :
-- Papotages, Créatifs, Business.
DELETE FROM public.antennes WHERE nom IN ('Autres', 'Bien-être');

UPDATE public.antennes
SET nom = 'Créatifs', slug = 'creatifs'
WHERE nom = 'Atelier créatif';

INSERT INTO public.antennes (nom, slug, ordre_affichage)
VALUES ('Business', 'business', 2)
ON CONFLICT (nom) DO NOTHING;

UPDATE public.antennes SET ordre_affichage = 0 WHERE nom = 'Papotages';
UPDATE public.antennes SET ordre_affichage = 1 WHERE nom = 'Créatifs';
