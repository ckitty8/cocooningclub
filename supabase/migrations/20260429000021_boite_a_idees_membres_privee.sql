-- =====================================================
-- Boîte à idées ouverte aux membres, visibilité restreinte
-- =====================================================
-- Jusqu'ici la boîte à idées était un outil interne admin : n'importe
-- quel utilisateur authentifié pouvait déjà lire TOUTES les idées et
-- TOUTES les réactions (policies "USING (true)"), ça ne posait pas de
-- souci tant que seuls des admins y accédaient (pas de front membre).
-- Les membres pouvant désormais soumettre des idées, on restreint la
-- lecture : une idée n'est visible que par son auteur et les admins.
-- Idem pour les réactions (avis des admins sur une idée), visibles par
-- l'auteur de l'idée concernée et les admins.
-- On ajoute aussi une policy admin explicite en écriture sur "idees"
-- (update/delete) : jusqu'ici seul l'auteur pouvait modifier/supprimer
-- sa propre idée, ce qui empêchait un admin de gérer une idée soumise
-- par un membre.
-- =====================================================

DROP POLICY IF EXISTS "idees_lecture_authentifie" ON public.idees;
CREATE POLICY "idees_lecture_soi_ou_admin" ON public.idees
  FOR SELECT TO authenticated
  USING (utilisateur_id = (select auth.uid()) OR is_admin());

CREATE POLICY "idees_admin_all" ON public.idees
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "reactions_lecture_authentifie" ON public.idee_reactions;
CREATE POLICY "reactions_lecture_soi_ou_admin" ON public.idee_reactions
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.idees i
      WHERE i.id = idee_reactions.idee_id
        AND i.utilisateur_id = (select auth.uid())
    )
  );
