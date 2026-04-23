-- =====================================================
-- Pré-inscriptions : téléphone + templates de messages
-- =====================================================

-- 1. Champ téléphone optionnel pour les inscriptions invités
ALTER TABLE inscriptions
  ADD COLUMN IF NOT EXISTS telephone_invite VARCHAR(20);

COMMENT ON COLUMN inscriptions.telephone_invite IS
  'Téléphone optionnel de l''invité — utilisé pour envoyer un message WhatsApp de confirmation.';

-- 2. Table des templates de messages (éditables par l'admin)
CREATE TABLE IF NOT EXISTS parametres_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cle         VARCHAR(80) UNIQUE NOT NULL,
  libelle     VARCHAR(200) NOT NULL,
  valeur      TEXT NOT NULL,
  description TEXT,
  modifie_le  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  modifie_par UUID REFERENCES utilisateurs(id) ON DELETE SET NULL
);

COMMENT ON TABLE parametres_messages IS
  'Templates de messages modifiables par l''admin. Variables supportées : {prenom}, {nom}, {titre}, {date}, {heure}, {lieu}';

-- Trigger pour maj auto de modifie_le
DROP TRIGGER IF EXISTS trg_parametres_messages_modifie_le ON parametres_messages;
CREATE TRIGGER trg_parametres_messages_modifie_le
  BEFORE UPDATE ON parametres_messages
  FOR EACH ROW EXECUTE FUNCTION maj_modifie_le();

-- 3. Seed des templates par défaut
INSERT INTO parametres_messages (cle, libelle, valeur, description) VALUES
  (
    'validation_mail_sujet',
    'Mail de validation — Sujet',
    'Votre pré-inscription est validée ✨',
    'Objet du mail envoyé quand l''admin valide une pré-inscription.'
  ),
  (
    'validation_mail_corps',
    'Mail de validation — Corps',
    'Bonjour {prenom},' || chr(10) || chr(10) ||
    'Votre pré-inscription à l''atelier "{titre}" du {date} à {heure} est validée. ✨' || chr(10) || chr(10) ||
    'Lieu : {lieu}' || chr(10) || chr(10) ||
    'À très vite !' || chr(10) ||
    'Cocooning Club',
    'Corps du mail envoyé quand l''admin valide une pré-inscription.'
  ),
  (
    'validation_whatsapp',
    'WhatsApp de validation',
    'Bonjour {prenom} ! Votre pré-inscription à l''atelier "{titre}" du {date} à {heure} est validée ✨ Lieu : {lieu}. À très vite ! — Cocooning Club',
    'Message WhatsApp envoyé quand l''admin valide une pré-inscription.'
  ),
  (
    'refus_mail_sujet',
    'Mail de refus — Sujet',
    'Votre pré-inscription n''a pas pu être validée',
    'Objet du mail envoyé quand l''admin refuse une pré-inscription.'
  ),
  (
    'refus_mail_corps',
    'Mail de refus — Corps',
    'Bonjour {prenom},' || chr(10) || chr(10) ||
    'Nous sommes désolés, votre pré-inscription à l''atelier "{titre}" du {date} n''a pas pu être validée.' || chr(10) || chr(10) ||
    'N''hésitez pas à revenir sur le site pour découvrir nos prochains ateliers.' || chr(10) || chr(10) ||
    'Avec douceur,' || chr(10) ||
    'Cocooning Club',
    'Corps du mail envoyé quand l''admin refuse une pré-inscription.'
  ),
  (
    'refus_whatsapp',
    'WhatsApp de refus',
    'Bonjour {prenom}, nous sommes désolés, votre pré-inscription à l''atelier "{titre}" du {date} n''a pas pu être validée. N''hésitez pas à revenir pour les prochains ateliers. — Cocooning Club',
    'Message WhatsApp envoyé quand l''admin refuse une pré-inscription.'
  )
ON CONFLICT (cle) DO NOTHING;

-- 4. RLS sur parametres_messages
ALTER TABLE parametres_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parametres_messages_admin_all" ON parametres_messages;

-- Seuls les admins peuvent lire/modifier les templates
CREATE POLICY "parametres_messages_admin_all"
  ON parametres_messages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE u.id = auth.uid() AND u.role = 'administrateur'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE u.id = auth.uid() AND u.role = 'administrateur'
    )
  );
