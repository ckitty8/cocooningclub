-- =====================================================
-- Politiques RLS additionnelles pour l'espace membre
-- =====================================================

-- 1. Un membre peut annuler / mettre à jour sa propre inscription.
DROP POLICY IF EXISTS "inscriptions_update_owner" ON inscriptions;
CREATE POLICY "inscriptions_update_owner"
  ON inscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = utilisateur_id)
  WITH CHECK (auth.uid() = utilisateur_id);

-- 2. Un membre peut consulter l'historique de ses paiements PayPal.
DROP POLICY IF EXISTS "transactions_paypal_select_owner" ON transactions_paypal;
CREATE POLICY "transactions_paypal_select_owner"
  ON transactions_paypal
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM inscriptions i
      WHERE i.id = transactions_paypal.inscription_id
        AND i.utilisateur_id = auth.uid()
    )
  );
