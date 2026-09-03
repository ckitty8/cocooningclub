-- =====================================================
-- Optimisation perf RLS : (select auth.uid()) au lieu de auth.uid()
-- =====================================================
-- Sans cette précaution, Postgres ré-évalue auth.uid() (et les
-- fonctions équivalentes) pour CHAQUE ligne examinée par une requête
-- au lieu de le calculer une seule fois par requête (initPlan). Sur de
-- gros volumes ça coûte cher ; ici l'impact réel est faible (petit
-- club) mais c'est la bonne pratique Postgres/Supabase recommandée par
-- l'advisor de performance (auth_rls_initplan, 24 policies concernées).
-- Comportement strictement identique, seule la forme change.
--
-- Appliqué en base via le MCP Supabase et vérifié : les 55 alertes
-- auth_rls_initplan ont disparu des advisors de performance après
-- application, et les requêtes anonymes (ateliers, catégories, avis
-- publics) continuent de fonctionner à l'identique.
-- =====================================================

ALTER POLICY "avis_creer" ON public.avis
  WITH CHECK (
  ((select auth.uid()) = utilisateur_id)
);

ALTER POLICY "contact_messages_admin_all" ON public.contact_messages
  USING (
  (EXISTS ( SELECT 1
   FROM utilisateurs u
  WHERE ((u.id = (select auth.uid())) AND (u.role = 'administrateur'::role_utilisateur))))
)
  WITH CHECK (
  (EXISTS ( SELECT 1
   FROM utilisateurs u
  WHERE ((u.id = (select auth.uid())) AND (u.role = 'administrateur'::role_utilisateur))))
);

ALTER POLICY "disponibilites_admin_all" ON public.disponibilites
  USING (
  (EXISTS ( SELECT 1
   FROM utilisateurs u
  WHERE ((u.id = (select auth.uid())) AND (u.role = 'administrateur'::role_utilisateur))))
)
  WITH CHECK (
  (EXISTS ( SELECT 1
   FROM utilisateurs u
  WHERE ((u.id = (select auth.uid())) AND (u.role = 'administrateur'::role_utilisateur))))
);

ALTER POLICY "documents_admin_all" ON public.documents
  USING (
  (EXISTS ( SELECT 1
   FROM utilisateurs u
  WHERE ((u.id = (select auth.uid())) AND (u.role = 'administrateur'::role_utilisateur))))
)
  WITH CHECK (
  (EXISTS ( SELECT 1
   FROM utilisateurs u
  WHERE ((u.id = (select auth.uid())) AND (u.role = 'administrateur'::role_utilisateur))))
);

ALTER POLICY "documents_lecture_membre" ON public.documents
  USING (
  ((acces = ANY (ARRAY['tous'::acces_document, 'membres'::acces_document])) AND (EXISTS ( SELECT 1
   FROM utilisateurs u
  WHERE ((u.id = (select auth.uid())) AND (u.role = 'membre'::role_utilisateur)))))
);

ALTER POLICY "form_fields_admin_all" ON public.form_fields
  USING (
  (EXISTS ( SELECT 1
   FROM utilisateurs u
  WHERE ((u.id = (select auth.uid())) AND (u.role = 'administrateur'::role_utilisateur))))
)
  WITH CHECK (
  (EXISTS ( SELECT 1
   FROM utilisateurs u
  WHERE ((u.id = (select auth.uid())) AND (u.role = 'administrateur'::role_utilisateur))))
);

ALTER POLICY "formulaires_admin_all" ON public.formulaires
  USING (
  (EXISTS ( SELECT 1
   FROM utilisateurs u
  WHERE ((u.id = (select auth.uid())) AND (u.role = 'administrateur'::role_utilisateur))))
)
  WITH CHECK (
  (EXISTS ( SELECT 1
   FROM utilisateurs u
  WHERE ((u.id = (select auth.uid())) AND (u.role = 'administrateur'::role_utilisateur))))
);

ALTER POLICY "reactions_soi_crud" ON public.idee_reactions
  USING (
  (utilisateur_id = (select auth.uid()))
)
  WITH CHECK (
  ((utilisateur_id = (select auth.uid())) AND (EXISTS ( SELECT 1
   FROM utilisateurs u
  WHERE ((u.id = (select auth.uid())) AND (u.role = 'administrateur'::role_utilisateur)))))
);

ALTER POLICY "idees_auteur_delete" ON public.idees
  USING (
  (utilisateur_id = (select auth.uid()))
);

ALTER POLICY "idees_auteur_modif" ON public.idees
  USING (
  (utilisateur_id = (select auth.uid()))
)
  WITH CHECK (
  (utilisateur_id = (select auth.uid()))
);

ALTER POLICY "idees_insert_authentifie" ON public.idees
  WITH CHECK (
  (utilisateur_id = (select auth.uid()))
);

ALTER POLICY "indisponibilites_admin_all" ON public.indisponibilites
  USING (
  (EXISTS ( SELECT 1
   FROM utilisateurs u
  WHERE ((u.id = (select auth.uid())) AND (u.role = 'administrateur'::role_utilisateur))))
)
  WITH CHECK (
  (EXISTS ( SELECT 1
   FROM utilisateurs u
  WHERE ((u.id = (select auth.uid())) AND (u.role = 'administrateur'::role_utilisateur))))
);

ALTER POLICY "inscriptions_insert_valid" ON public.inscriptions
  WITH CHECK (
  ((EXISTS ( SELECT 1
   FROM ateliers a
  WHERE ((a.id = inscriptions.atelier_id) AND (a.statut = ANY (ARRAY['publie'::statut_atelier, 'complet'::statut_atelier]))))) AND ((((select auth.uid()) IS NOT NULL) AND (utilisateur_id = (select auth.uid())) AND (nom_invite IS NULL) AND (prenom_invite IS NULL) AND (email_invite IS NULL)) OR ((utilisateur_id IS NULL) AND (nom_invite IS NOT NULL) AND ((length(TRIM(BOTH FROM nom_invite)) >= 1) AND (length(TRIM(BOTH FROM nom_invite)) <= 100)) AND (prenom_invite IS NOT NULL) AND ((length(TRIM(BOTH FROM prenom_invite)) >= 1) AND (length(TRIM(BOTH FROM prenom_invite)) <= 100)) AND (email_invite IS NOT NULL) AND ((email_invite)::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text))) AND (statut_paiement = ANY (ARRAY['en_attente'::statut_paiement, 'non_requis'::statut_paiement])) AND (present = false) AND (annule_le IS NULL))
);

ALTER POLICY "inscriptions_select_owner" ON public.inscriptions
  USING (
  ((select auth.uid()) = utilisateur_id)
);

ALTER POLICY "jours_feries_lecture_admin" ON public.jours_feries
  USING (
  (EXISTS ( SELECT 1
   FROM utilisateurs u
  WHERE ((u.id = (select auth.uid())) AND (u.role = 'administrateur'::role_utilisateur))))
);

ALTER POLICY "logs_admin_lecture" ON public.logs
  USING (
  (EXISTS ( SELECT 1
   FROM utilisateurs u
  WHERE ((u.id = (select auth.uid())) AND (u.role = 'administrateur'::role_utilisateur))))
);

ALTER POLICY "logs_insertion_soi" ON public.logs
  WITH CHECK (
  ((utilisateur_id = (select auth.uid())) OR (utilisateur_id IS NULL))
);

ALTER POLICY "parametres_messages_admin_all" ON public.parametres_messages
  USING (
  (EXISTS ( SELECT 1
   FROM utilisateurs u
  WHERE ((u.id = (select auth.uid())) AND (u.role = 'administrateur'::role_utilisateur))))
)
  WITH CHECK (
  (EXISTS ( SELECT 1
   FROM utilisateurs u
  WHERE ((u.id = (select auth.uid())) AND (u.role = 'administrateur'::role_utilisateur))))
);

ALTER POLICY "transactions_admin" ON public.transactions_paypal
  USING (
  (EXISTS ( SELECT 1
   FROM utilisateurs u
  WHERE ((u.id = (select auth.uid())) AND (u.role = 'administrateur'::role_utilisateur))))
);

ALTER POLICY "transactions_voir_siennes" ON public.transactions_paypal
  USING (
  (EXISTS ( SELECT 1
   FROM inscriptions i
  WHERE ((i.id = transactions_paypal.inscription_id) AND (i.utilisateur_id = (select auth.uid())))))
);

ALTER POLICY "utilisateurs_select_self" ON public.utilisateurs
  USING (
  ((select auth.uid()) = id)
);

ALTER POLICY "utilisateurs_update_self" ON public.utilisateurs
  USING (
  ((select auth.uid()) = id)
)
  WITH CHECK (
  ((select auth.uid()) = id)
);

ALTER POLICY "vacances_scolaires_lecture_admin" ON public.vacances_scolaires
  USING (
  (EXISTS ( SELECT 1
   FROM utilisateurs u
  WHERE ((u.id = (select auth.uid())) AND (u.role = 'administrateur'::role_utilisateur))))
);

ALTER POLICY "visites_admin_lecture" ON public.visites_site
  USING (
  (EXISTS ( SELECT 1
   FROM utilisateurs u
  WHERE ((u.id = (select auth.uid())) AND (u.role = 'administrateur'::role_utilisateur))))
);