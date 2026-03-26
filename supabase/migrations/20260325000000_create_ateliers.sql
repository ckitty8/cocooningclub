CREATE TABLE public.ateliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  spots INTEGER NOT NULL DEFAULT 8,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  price TEXT NOT NULL DEFAULT 'Gratuit',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ateliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ateliers" ON public.ateliers
  FOR SELECT USING (true);

CREATE POLICY "No public insert" ON public.ateliers
  FOR INSERT WITH CHECK (false);

-- Données initiales
INSERT INTO public.ateliers (title, date, time, spots, description, location, price) VALUES
  ('Atelier Bougies Parfumées', 'Samedi 22 Mars', '14h – 17h', 8, 'Créez vos propres bougies avec des cires naturelles et des huiles essentielles.', 'Gagny', 'Gratuit'),
  ('Aquarelle & Détente', 'Samedi 5 Avril', '10h – 13h', 10, 'Initiez-vous à l''aquarelle dans une ambiance douce et bienveillante.', 'Gagny', 'Gratuit'),
  ('Macramé Mural', 'Samedi 19 Avril', '14h – 17h', 6, 'Apprenez les nœuds de base et repartez avec votre création murale.', 'Chelles', 'Gratuit'),
  ('Poterie & Modelage', 'Samedi 3 Mai', '10h – 13h', 8, 'Découvrez le travail de la terre et façonnez votre premier objet en argile.', 'Le Raincy', 'Gratuit'),
  ('Broderie Moderne', 'Samedi 17 Mai', '14h – 17h', 10, 'Apprenez les points essentiels et créez un motif contemporain sur tambour.', 'Gagny', 'Gratuit'),
  ('Atelier Terrarium', 'Samedi 31 Mai', '10h – 13h', 8, 'Composez votre mini-jardin sous verre avec des plantes tropicales.', 'Chelles', 'Gratuit'),
  ('Lettering & Calligraphie', 'Samedi 14 Juin', '14h – 17h', 10, 'Initiez-vous au brush lettering et repartez avec une œuvre encadrée.', 'Gagny', 'Gratuit'),
  ('Savons Naturels', 'Samedi 28 Juin', '10h – 13h', 8, 'Fabriquez vos savons artisanaux aux huiles végétales et parfums naturels.', 'Le Raincy', 'Gratuit'),
  ('Tissage sur Cadre', 'Samedi 12 Juillet', '14h – 17h', 6, 'Créez une pièce tissée unique en jouant avec les textures et les couleurs.', 'Gagny', 'Gratuit'),
  ('Atelier Céramique', 'Samedi 26 Juillet', '10h – 13h', 8, 'Modelez et décorez une tasse ou un bol en céramique artisanale.', 'Chelles', 'Gratuit'),
  ('Couronnes de Fleurs Séchées', 'Samedi 9 Août', '14h – 17h', 10, 'Composez une couronne décorative avec des fleurs séchées et stabilisées.', 'Le Raincy', 'Gratuit'),
  ('Initiation Crochet', 'Samedi 23 Août', '10h – 13h', 8, 'Apprenez les mailles de base et réalisez votre premier accessoire au crochet.', 'Gagny', 'Gratuit');
