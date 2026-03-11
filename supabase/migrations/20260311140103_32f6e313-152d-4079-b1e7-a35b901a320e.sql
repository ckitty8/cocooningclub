CREATE TABLE public.inscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  workshop TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.inscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can register" ON public.inscriptions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "No public read access" ON public.inscriptions
  FOR SELECT USING (false);