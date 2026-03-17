-- Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'membre' CHECK (role IN ('membre', 'admin')),
  status TEXT NOT NULL DEFAULT 'actif' CHECK (status IN ('actif', 'inactif')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can delete profiles
CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Allow insert during signup
CREATE POLICY "Allow insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ateliers table
CREATE TABLE public.ateliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  date DATE NOT NULL,
  time TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT 'Gagny',
  capacity INTEGER NOT NULL DEFAULT 12,
  type TEXT NOT NULL DEFAULT 'general',
  photo_url TEXT,
  price TEXT NOT NULL DEFAULT 'Gratuit',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ateliers ENABLE ROW LEVEL SECURITY;

-- Anyone can read ateliers (public calendar)
CREATE POLICY "Anyone can read ateliers" ON public.ateliers
  FOR SELECT USING (true);

-- Only admins can insert/update/delete ateliers
CREATE POLICY "Admins can insert ateliers" ON public.ateliers
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update ateliers" ON public.ateliers
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete ateliers" ON public.ateliers
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Reservations table
CREATE TABLE public.reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  atelier_id UUID NOT NULL REFERENCES public.ateliers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'confirmee' CHECK (status IN ('confirmee', 'presente', 'absente', 'annulee')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(member_id, atelier_id)
);

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Members can read their own reservations
CREATE POLICY "Members can read own reservations" ON public.reservations
  FOR SELECT USING (auth.uid() = member_id);

-- Members can insert their own reservations
CREATE POLICY "Members can insert own reservations" ON public.reservations
  FOR INSERT WITH CHECK (auth.uid() = member_id);

-- Members can update their own reservations (cancel)
CREATE POLICY "Members can update own reservations" ON public.reservations
  FOR UPDATE USING (auth.uid() = member_id);

-- Admins can read all reservations
CREATE POLICY "Admins can read all reservations" ON public.reservations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can update all reservations
CREATE POLICY "Admins can update all reservations" ON public.reservations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can delete reservations
CREATE POLICY "Admins can delete all reservations" ON public.reservations
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Seed some ateliers
INSERT INTO public.ateliers (title, description, date, time, location, capacity, type, price) VALUES
  ('Atelier Bougies Parfumées', 'Créez vos propres bougies avec des cires naturelles et des huiles essentielles.', '2026-03-22', '14h – 17h', 'Gagny', 8, 'bougie', 'Gratuit'),
  ('Aquarelle & Détente', 'Initiez-vous à l''aquarelle dans une ambiance douce et bienveillante.', '2026-04-05', '10h – 13h', 'Gagny', 10, 'peinture', 'Gratuit'),
  ('Macramé Mural', 'Apprenez les nœuds de base et repartez avec votre création murale.', '2026-04-19', '14h – 17h', 'Chelles', 6, 'textile', 'Gratuit'),
  ('Poterie & Modelage', 'Découvrez le travail de la terre et façonnez votre premier objet en argile.', '2026-05-03', '10h – 13h', 'Le Raincy', 8, 'poterie', 'Gratuit'),
  ('Broderie Moderne', 'Apprenez les points essentiels et créez un motif contemporain sur tambour.', '2026-05-17', '14h – 17h', 'Gagny', 10, 'textile', 'Gratuit'),
  ('Atelier Terrarium', 'Composez votre mini-jardin sous verre avec des plantes tropicales.', '2026-05-31', '10h – 13h', 'Chelles', 8, 'nature', 'Gratuit'),
  ('Lettering & Calligraphie', 'Initiez-vous au brush lettering et repartez avec une œuvre encadrée.', '2026-06-14', '14h – 17h', 'Gagny', 10, 'art', 'Gratuit'),
  ('Savons Naturels', 'Fabriquez vos savons artisanaux aux huiles végétales et parfums naturels.', '2026-06-28', '10h – 13h', 'Le Raincy', 8, 'bien-etre', 'Gratuit'),
  ('Tissage sur Cadre', 'Créez une pièce tissée unique en jouant avec les textures et les couleurs.', '2026-07-12', '14h – 17h', 'Gagny', 6, 'textile', 'Gratuit'),
  ('Atelier Céramique', 'Modelez et décorez une tasse ou un bol en céramique artisanale.', '2026-07-26', '10h – 13h', 'Chelles', 8, 'poterie', 'Gratuit'),
  ('Couronnes de Fleurs Séchées', 'Composez une couronne décorative avec des fleurs séchées et stabilisées.', '2026-08-09', '14h – 17h', 'Le Raincy', 10, 'nature', 'Gratuit'),
  ('Initiation Crochet', 'Apprenez les mailles de base et réalisez votre premier accessoire au crochet.', '2026-08-23', '10h – 13h', 'Gagny', 8, 'textile', 'Gratuit');

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT DO NOTHING;

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can read avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
