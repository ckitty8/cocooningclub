-- Suite du renommage catégorie -> antenne : les vues exposaient encore
-- des colonnes "categorie"/"categorie_slug" alors que la table sous-jacente
-- s'appelle désormais antennes. Aucune vue n'était consommée côté front
-- (vérifié), ALTER VIEW ... RENAME COLUMN est donc sans risque de rupture.

ALTER VIEW public.vue_prochains_ateliers RENAME COLUMN categorie TO antenne;
ALTER VIEW public.vue_prochains_ateliers RENAME COLUMN categorie_slug TO antenne_slug;
ALTER VIEW public.vue_avis_publies RENAME COLUMN categorie TO antenne;
