import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { validerNouveauCompte, type NouveauCompte } from "@/lib/nouveauCompte";
import { logAction } from "@/utils/logAction";

// Création d'un compte par l'équipe, partagée par « Membres » et « Offre & adhésions » (Ajouter une adhésion).

export type ResultatCreation = { id: string; erreur?: undefined } | { id?: undefined; erreur: string };

export const creerCompte = async (c: NouveauCompte): Promise<ResultatCreation> => {
  const invalide = validerNouveauCompte(c);
  if (invalide) return { erreur: invalide };
  const email = c.email.trim();

  // Une adresse ne sert qu'une fois : on renvoie vers la personne existante plutôt que de créer un doublon.
  const { data: existante } = await supabase.from("utilisateurs").select("id").ilike("email", email.replace(/[\\%_]/g, "\\$&")).limit(1);
  if (existante && existante.length > 0) return { erreur: "Cette adresse e-mail a déjà un compte : choisissez la personne dans la liste." };

  // 1. Actif → créer le compte Supabase Auth (déclenche le mail de confirmation). Inactif → rien, aucun mail.
  let authUserId: string | null = null;
  if (c.est_actif) {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: c.mot_de_passe!,
      options: { emailRedirectTo: `${window.location.origin}/login` },
    });
    if (authError || !authData.user) return { erreur: authError?.message ?? "Erreur lors de la création du compte." };
    authUserId = authData.user.id;
  }

  // 2. Fiche utilisateurs.
  //    - Actif : liée à l'UUID auth (pour que les RLS auth.uid() = id marchent).
  //    - Inactif : Postgres génère l'UUID (pas de compte de connexion associé).
  const payload: TablesInsert<"utilisateurs"> = {
    email,
    nom: c.nom.trim(),
    prenom: c.prenom.trim(),
    telephone: c.telephone?.trim() || null,
    role: c.role,
    est_actif: c.est_actif,
    debut_abonnement: c.debut_abonnement || null,
    fin_abonnement: c.fin_abonnement || null,
    commune: c.commune?.trim() || null,
    activite: c.activite?.trim() || null,
  };
  if (authUserId) payload.id = authUserId;

  const { data, error } = await supabase.from("utilisateurs").insert(payload).select("id").single();
  if (error || !data) return { erreur: error?.message ?? "Erreur lors de la création de la fiche." };

  logAction("membre.create", "utilisateurs", data.id, {
    email, prenom: payload.prenom, nom: payload.nom, role: c.role, est_actif: c.est_actif,
  });
  return { id: data.id };
};
