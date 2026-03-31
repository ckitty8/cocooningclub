-- ============================================================
-- Seed des ateliers réels dans la nouvelle structure
-- ============================================================

-- On récupère les IDs des catégories
DO $$
DECLARE
  cat_papotage UUID;
  cat_terrarium UUID;
  cat_pierre UUID;
BEGIN
  SELECT id INTO cat_papotage FROM categories WHERE slug = 'papotage';
  SELECT id INTO cat_terrarium FROM categories WHERE slug = 'terrarium';
  SELECT id INTO cat_pierre FROM categories WHERE slug = 'pierre-oracle';

  INSERT INTO ateliers (categorie_id, titre, description, description_courte, lieu, date_atelier, heure_debut, duree, places_max, places_disponibles, tarif_standard, tarif_affichage, statut) VALUES
    (cat_papotage,  'Atelier Papotage',                 'Moment d''échange entre entrepreneuses. Ambiance chill autour d''un thé ou café. Format discussion et partage. Consommation obligatoire sur place.', 'Échange et partage autour d''un café',       'Le FLOW · Gagny', '2026-03-30', '14:30', '2 hours',  12, 12, 0,     'Consommation sur place', 'publie'),
    (cat_terrarium, 'Atelier Créatif — Terrarium',      'Activité manuelle et moment cocooning. Créez votre propre terrarium et repartez avec votre mini-jardin sous verre.',                                  'Créez votre mini-jardin sous verre',         'À préciser',       '2026-04-07', '13:30', '2 hours',  8,  8,  25.00, '25€',                    'publie'),
    (cat_papotage,  'Atelier Papotage',                 'Moment d''échange entre entrepreneuses. Ambiance chill autour d''un thé ou café. Format discussion et partage. Consommation obligatoire sur place.', 'Échange et partage autour d''un café',       'Le FLOW · Gagny', '2026-04-28', '14:30', '2 hours',  12, 12, 0,     'Consommation sur place', 'publie'),
    (cat_pierre,    'Atelier Créatif — Pierre & Oracle','Activité manuelle et moment cocooning autour du thème Pierre et Oracle. Tarif à confirmer.',                                                          'Découverte des pierres et oracles',          'À préciser',       '2026-05-05', '14:00', '2 hours',  8,  8,  0,     'À définir',              'publie'),
    (cat_papotage,  'Atelier Papotage',                 'Moment d''échange entre entrepreneuses. Ambiance chill autour d''un thé ou café. Format discussion et partage. Consommation obligatoire sur place.', 'Échange et partage autour d''un café',       'Le FLOW · Gagny', '2026-05-26', '14:30', '2 hours',  12, 12, 0,     'Consommation sur place', 'publie');
END $$;
