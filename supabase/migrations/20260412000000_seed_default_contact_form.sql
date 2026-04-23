-- =====================================================
-- Formulaire de contact par défaut pour le site public
-- =====================================================
-- Crée le formulaire "Contact site" avec ses champs par défaut :
-- Prénom, Nom, Email, Téléphone (optionnel), Message
-- =====================================================

DO $$
DECLARE
  v_formulaire_id UUID;
BEGIN
  -- Ne rien faire si un formulaire actif existe déjà
  IF EXISTS (SELECT 1 FROM formulaires WHERE est_actif = TRUE) THEN
    RAISE NOTICE 'Un formulaire actif existe déjà, aucune insertion faite.';
    RETURN;
  END IF;

  -- 1. Créer le formulaire
  INSERT INTO formulaires (nom, description, est_actif)
  VALUES (
    'Contact site',
    'Formulaire de contact affiché dans la section "Envie de nous rejoindre ?" du site public.',
    TRUE
  )
  RETURNING id INTO v_formulaire_id;

  -- 2. Créer les champs (ordre = ordre d'affichage)
  INSERT INTO form_fields (formulaire_id, label, field_type, obligatoire, position, deletable, options) VALUES
    (v_formulaire_id, 'Prénom',    'text',     TRUE,  1, TRUE, NULL),
    (v_formulaire_id, 'Nom',       'text',     TRUE,  2, TRUE, NULL),
    (v_formulaire_id, 'Email',     'email',    TRUE,  3, FALSE, NULL),
    (v_formulaire_id, 'Téléphone', 'tel',      FALSE, 4, TRUE, NULL),
    (v_formulaire_id, 'Message',   'textarea', TRUE,  5, TRUE, NULL);

  RAISE NOTICE 'Formulaire "Contact site" créé avec 5 champs.';
END $$;
