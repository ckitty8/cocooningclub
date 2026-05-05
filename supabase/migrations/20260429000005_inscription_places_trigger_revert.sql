-- =====================================================
-- Trigger places : restaurer le compteur sur confirme → en_attente
-- =====================================================
-- Le trigger d'origine (decrementer_places, cf. 20260330000000) gère :
--   - confirme (nouveau)            → places--
--   - confirme → annule             → places++
-- Mais oublie le cas confirme → en_attente : si l'admin remet une
-- inscription en attente, la place reste réservée à tort.
--
-- On ajoute la transition confirme → en_attente dans la branche
-- "incrémenter". Idempotent : remplace juste la fonction, le trigger
-- existant continue à pointer dessus.
-- =====================================================

CREATE OR REPLACE FUNCTION decrementer_places()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.statut = 'confirme' AND (OLD IS NULL OR OLD.statut != 'confirme') THEN
    UPDATE ateliers
    SET places_disponibles = places_disponibles - 1
    WHERE id = NEW.atelier_id AND places_disponibles > 0;
  END IF;

  IF OLD IS NOT NULL
     AND OLD.statut = 'confirme'
     AND NEW.statut IN ('annule', 'en_attente') THEN
    UPDATE ateliers
    SET places_disponibles = places_disponibles + 1
    WHERE id = NEW.atelier_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
