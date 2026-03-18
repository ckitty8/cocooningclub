-- Inscriptions table (anonymous sign-up form on the home page)
CREATE TABLE IF NOT EXISTS public.inscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  workshop TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.inscriptions ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public registration form)
CREATE POLICY "Anyone can insert inscriptions" ON public.inscriptions
  FOR INSERT WITH CHECK (true);

-- Only admins can read inscriptions
CREATE POLICY "Admins can read inscriptions" ON public.inscriptions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Only admins can delete inscriptions
CREATE POLICY "Admins can delete inscriptions" ON public.inscriptions
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
