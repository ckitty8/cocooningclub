-- Ajoute la clé étrangère atelier_id dans inscriptions
ALTER TABLE public.inscriptions
  ADD COLUMN atelier_id UUID REFERENCES public.ateliers(id) ON DELETE SET NULL;

-- Index pour les jointures
CREATE INDEX inscriptions_atelier_id_idx ON public.inscriptions(atelier_id);

-- Vue pratique pour retrouver les inscriptions avec le détail de l'atelier
CREATE VIEW public.inscriptions_avec_atelier AS
  SELECT
    i.id,
    i.name,
    i.email,
    i.created_at,
    a.id AS atelier_id,
    a.title AS atelier_title,
    a.date AS atelier_date,
    a.time AS atelier_time,
    a.location AS atelier_location,
    a.price AS atelier_price
  FROM public.inscriptions i
  LEFT JOIN public.ateliers a ON a.id = i.atelier_id;
