-- Remplace les données de la table ateliers par les vrais ateliers du site
TRUNCATE public.ateliers RESTART IDENTITY CASCADE;

INSERT INTO public.ateliers (title, date, time, spots, description, location, price) VALUES
  ('Atelier Papotage',              'Mardi 30 Mars',  '14h30 – 16h30', 12, 'Moment d''échange entre entrepreneuses. Ambiance chill autour d''un thé ou café. Format discussion et partage. Consommation obligatoire sur place.', 'Le FLOW · Gagny',  'Consommation sur place'),
  ('Atelier Créatif — Terrarium',   'Mardi 7 Avril',  '13h30 –',        8, 'Activité manuelle et moment cocooning. Créez votre propre terrarium et repartez avec votre mini-jardin sous verre.',                                 'À préciser',        '25€'),
  ('Atelier Papotage',              'Mardi 28 Avril', '14h30 – 16h30', 12, 'Moment d''échange entre entrepreneuses. Ambiance chill autour d''un thé ou café. Format discussion et partage. Consommation obligatoire sur place.', 'Le FLOW · Gagny',  'Consommation sur place'),
  ('Atelier Créatif — Pierre & Oracle', 'Mardi 5 Mai', 'À définir',    8, 'Activité manuelle et moment cocooning autour du thème Pierre et Oracle. Tarif à confirmer.',                                                         'À préciser',        'À définir'),
  ('Atelier Papotage',              'Mardi 26 Mai',   '14h30 – 16h30', 12, 'Moment d''échange entre entrepreneuses. Ambiance chill autour d''un thé ou café. Format discussion et partage. Consommation obligatoire sur place.', 'Le FLOW · Gagny',  'Consommation sur place');
