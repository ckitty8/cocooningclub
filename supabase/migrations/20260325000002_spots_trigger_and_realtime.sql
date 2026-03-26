-- Trigger : décrémente spots sur ateliers à chaque inscription
CREATE OR REPLACE FUNCTION decrement_atelier_spots()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.atelier_id IS NOT NULL THEN
    UPDATE public.ateliers
    SET spots = spots - 1
    WHERE id = NEW.atelier_id AND spots > 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_inscription_insert
  AFTER INSERT ON public.inscriptions
  FOR EACH ROW
  EXECUTE FUNCTION decrement_atelier_spots();

-- Active Realtime sur la table ateliers pour que le frontend reçoive les mises à jour
ALTER PUBLICATION supabase_realtime ADD TABLE public.ateliers;
